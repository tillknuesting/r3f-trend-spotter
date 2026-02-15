package collectors

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"r3f-trend-spotter/pkg/domain"

	"github.com/mmcdole/gofeed"
)

type Source struct {
	Name     string `json:"name"`
	URL      string `json:"url"`
	Category string `json:"category"`
}

type UniversalCollector struct{}

func NewUniversalCollector() *UniversalCollector {
	return &UniversalCollector{}
}

func (c *UniversalCollector) Name() string {
	return "tech_blogs"
}

func (c *UniversalCollector) Collect(ctx context.Context) ([]domain.Trend, error) {
	// Read sources.json
	// Assuming it's in the same directory as the executable or a known relative path
	// For robustness in this setup, we'll try to find it.
	// In production, embed or config path.
	sourcesFile := "internal/collectors/sources.json"

	bytes, err := os.ReadFile(sourcesFile)
	if err != nil {
		// Try absolute path as fallback for development
		wd, _ := os.Getwd()
		sourcesFile = filepath.Join(wd, "internal/collectors/sources.json")
		bytes, err = os.ReadFile(sourcesFile)
		if err != nil {
			return nil, fmt.Errorf("failed to read sources.json: %w", err)
		}
	}

	var sources []Source
	if err := json.Unmarshal(bytes, &sources); err != nil {
		return nil, fmt.Errorf("failed to parse sources.json: %w", err)
	}

	var allTrends []domain.Trend
	var mu sync.Mutex
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 10) // Limit concurrent fetches to 10

	fp := gofeed.NewParser()
	fp.Client = &http.Client{Timeout: 10 * time.Second}

	for _, source := range sources {
		wg.Add(1)
		go func(s Source) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// Check context cancellation
			select {
			case <-ctx.Done():
				return
			default:
			}

			feed, err := fp.ParseURLWithContext(s.URL, ctx)
			if err != nil {
				// Log but don't fail everything
				// log.Printf("Failed to fetch %s: %v", s.Name, err)
				return
			}

			// Get top 3 items per feed
			limit := 3
			if len(feed.Items) < limit {
				limit = len(feed.Items)
			}

			var localTrends []domain.Trend
			for i := 0; i < limit; i++ {
				item := feed.Items[i]

				// Skip old items (older than 7 days)
				if item.PublishedParsed != nil && time.Since(*item.PublishedParsed) > 7*24*time.Hour {
					continue
				}

				desc := item.Description
				if desc == "" {
					desc = item.Content
				}
				// Truncate description
				if len(desc) > 200 {
					desc = desc[:200] + "..."
				}

				timestamp := time.Now()
				if item.PublishedParsed != nil {
					timestamp = *item.PublishedParsed
				}

				localTrends = append(localTrends, domain.Trend{
					ID:          item.Link,
					Title:       item.Title,
					Description: desc,
					URL:         item.Link,
					Source:      "tech_blogs", // Unified source name
					Timestamp:   timestamp,
					Metadata: map[string]interface{}{
						"author":   s.Name,
						"category": s.Category,
					},
				})
			}

			mu.Lock()
			allTrends = append(allTrends, localTrends...)
			mu.Unlock()
		}(source)
	}

	wg.Wait()
	return allTrends, nil
}
