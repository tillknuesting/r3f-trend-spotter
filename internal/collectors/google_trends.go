package collectors

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"r3f-trend-spotter/pkg/domain"

	"github.com/chromedp/chromedp"
)

type GoogleTrendsCollector struct{}

func NewGoogleTrendsCollector() *GoogleTrendsCollector {
	return &GoogleTrendsCollector{}
}

func (c *GoogleTrendsCollector) Name() string {
	return "google_trends"
}

func (c *GoogleTrendsCollector) Collect(ctx context.Context) ([]domain.Trend, error) {
	var trends []domain.Trend

	// Struct to hold raw scraped data
	type rawTrend struct {
		Title   string
		Traffic string
		URL     string // We might get this from the news link
	}
	var nodes []rawTrend

	// Selectors based on research
	// Item: tr.enOdEe-wZVHld-xMbwt
	// Title: td:nth-child(2) > div
	// Traffic: td:nth-child(3) > div > div:first-child
	// Click target to reveal news: tr.enOdEe-wZVHld-xMbwt (the row itself)

	// Since clicking every row is slow/complex for a simple pass,
	// we will first grab the list. If we need deep links, we'd need to iterate.
	// For now, let's grab the top list.
	err := RunWithTimeout(ctx, 30*time.Second,
		chromedp.Navigate("https://trends.google.com/trends/trendingsearches/daily?geo=US"),
		chromedp.WaitVisible("tr.enOdEe-wZVHld-xMbwt"),
		chromedp.Evaluate(`
			Array.from(document.querySelectorAll('tr.enOdEe-wZVHld-xMbwt')).slice(0, 20).map(row => {
				const titleParams = row.querySelector('td:nth-child(2) > div');
				const trafficParams = row.querySelector('td:nth-child(3) > div > div:first-child');
				// Construct a Google search URL as fallback since direct link requires clicking
				const query = titleParams ? titleParams.innerText.trim() : "";
				const url = "https://www.google.com/search?q=" + encodeURIComponent(query);
				
				return {
					title: query,
					traffic: trafficParams ? trafficParams.innerText.trim() : "",
					url: url 
				};
			})
		`, &nodes),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scrape Google Trends: %w", err)
	}

	for _, n := range nodes {
		if n.Title == "" {
			continue
		}

		// Parse traffic (e.g. "200k+")
		score := parseTraffic(n.Traffic)

		trends = append(trends, domain.Trend{
			ID:          n.URL,
			Title:       n.Title,
			Description: fmt.Sprintf("Trending with %s searches", n.Traffic),
			URL:         n.URL,
			Source:      "google_trends",
			Score:       score, // Raw traffic score
			Metadata:    map[string]interface{}{"raw_traffic": n.Traffic},
			Timestamp:   time.Now(),
		})
	}

	return trends, nil
}

func parseTraffic(s string) float64 {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, "+", "")
	s = strings.ReplaceAll(s, " searches", "")
	s = strings.TrimSpace(s)

	multiplier := 1.0
	if strings.Contains(s, "k") {
		multiplier = 1000.0
		s = strings.ReplaceAll(s, "k", "")
	} else if strings.Contains(s, "m") {
		multiplier = 1000000.0
		s = strings.ReplaceAll(s, "m", "")
	}

	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return val * multiplier
}
