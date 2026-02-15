package main

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"r3f-trend-spotter/internal/analysis"
	"r3f-trend-spotter/internal/collectors"
	"r3f-trend-spotter/internal/llm"
	"r3f-trend-spotter/internal/output"
	"r3f-trend-spotter/internal/storage"
	"r3f-trend-spotter/pkg/domain"
)

func main() {
	// Initialize context with a timeout for the whole operation
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Channels for results
	results := make(chan []domain.Trend, 15)
	var wg sync.WaitGroup

	// We have 4 main collectors now:
	// 1. Hacker News (Browser)
	// 2. GitHub Trends (Browser)
	// 3. Google Trends (Browser)
	// 4. Universal RSS (HTTP)
	wg.Add(4)

	// 1. Hacker News
	go func() {
		defer wg.Done()
		fmt.Println("Collecting from hackernews...")
		start := time.Now()

		// Create local browser context
		bCtx, bCancel := collectors.NewBrowserContext(ctx, true)
		defer bCancel()

		trends, err := collectors.NewHackerNewsCollector().Collect(bCtx)
		if err != nil {
			log.Printf("Hacker News collection failed: %v", err)
		} else {
			fmt.Printf("Collected %d trends from hackernews in %v\n", len(trends), time.Since(start))
			results <- trends
		}
	}()

	// 2. GitHub Trends
	go func() {
		defer wg.Done()
		fmt.Println("Collecting from github_trends...")
		start := time.Now()

		// Create local browser context
		bCtx, bCancel := collectors.NewBrowserContext(ctx, true)
		defer bCancel()

		trends, err := collectors.NewGitHubTrendsCollector().Collect(bCtx)
		if err != nil {
			log.Printf("GitHub Trends collection failed: %v", err)
		} else {
			fmt.Printf("Collected %d trends from github_trends in %v\n", len(trends), time.Since(start))
			results <- trends
		}
	}()

	// 3. Google Trends
	go func() {
		defer wg.Done()
		fmt.Println("Collecting from google_trends...")
		start := time.Now()

		// Create local browser context
		bCtx, bCancel := collectors.NewBrowserContext(ctx, true)
		defer bCancel()

		// Note: GoogleTrendsCollector.Collect takes a context.
		// If it's the version using chromedp internally on the passed context, we pass bCtx.
		trends, err := collectors.NewGoogleTrendsCollector().Collect(bCtx)
		if err != nil {
			log.Printf("Google Trends collection failed: %v", err)
		} else {
			fmt.Printf("Collected %d trends from google_trends in %v\n", len(trends), time.Since(start))
			results <- trends
		}
	}()

	// 4. Universal RSS Collector (tech_blogs)
	go func() {
		defer wg.Done()
		fmt.Println("Collecting from 60+ Tech Blogs/Newsletters...")
		start := time.Now()

		// No browser needed, uses HTTP client
		trends, err := collectors.NewUniversalCollector().Collect(ctx)
		if err != nil {
			log.Printf("Universal collection failed: %v", err)
		} else {
			fmt.Printf("Collected %d trends from tech_blogs in %v\n", len(trends), time.Since(start))
			results <- trends
		}
	}()

	// Wait and Close Channel
	go func() {
		wg.Wait()
		close(results)
	}()

	// Aggregation
	var allTrends []domain.Trend
	for trendBatch := range results {
		allTrends = append(allTrends, trendBatch...)
	}

	// Analysis & Scoring
	scorer := analysis.NewScorer()
	scoredTrends := scorer.ScoreTrends(allTrends)

	// Output Top 20 (Expanded list due to more sources)
	fmt.Println("\n--- Top Scored Trends (Smart Scoring) ---")
	limit := 20
	if len(scoredTrends) < limit {
		limit = len(scoredTrends)
	}

	topTrends := scoredTrends[:limit]
	for i, t := range topTrends {
		fmt.Printf("%d. [%.1f] [%s] %s\n   %s\n   %s\n",
			i+1, t.Score, t.Source, t.Title, t.Description, t.URL)
	}

	// LLM: Generate Summary for the #1 Trend
	if len(topTrends) > 0 {
		bestTrend := &topTrends[0]
		fmt.Printf("\n🤖 Asking Z.AI to browse and summarize: %s...\n", bestTrend.Title)

		client, err := llm.NewClient()
		if err != nil {
			log.Printf("Failed to create LLM client: %v", err)
		} else {
			summary, err := client.GenerateSummary(bestTrend.Title, bestTrend.URL)
			if err != nil {
				log.Printf("LLM Generation failed: %v", err)
			} else {
				bestTrend.Summary = summary
				fmt.Printf("\n✨ Z.AI Summary:\n%s\n", summary)
			}
		}
	}

	// Generate Report
	reportPath, err := output.GenerateMarkdownReport(topTrends, ".")
	if err != nil {
		log.Printf("Failed to generate report: %v", err)
	} else {
		fmt.Printf("\nReport generated: %s\n", reportPath)
	}

	// Dashboard: Generate JSON for Tech Signals
	// We output to 'web/public/data' so the React app can load it.
	jsonPath, err := output.GenerateJSONReport(topTrends, "web/public/data")
	if err != nil {
		log.Printf("Failed to generate JSON report: %v", err)
	} else {
		fmt.Printf("Dashboard data generated: %s\n", jsonPath)
	}

	// Persistence: Save to Cloudflare D1
	d1, err := storage.NewD1Client()
	if err == nil {
		fmt.Println("\n💾 Saving to Cloudflare D1...")
		if err := d1.SaveTrends(topTrends); err != nil {
			log.Printf("Failed to save to D1: %v", err)
		} else {
			fmt.Println("Success! Trends persisted to DB.")
		}
	} else {
		fmt.Println("\n(Skipping D1 save: credentials not set)")
	}
}
