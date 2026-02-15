package collectors

import (
	"context"
	"fmt"
	"time"

	"r3f-trend-spotter/pkg/domain"

	"github.com/chromedp/chromedp"
)

type HackerNewsCollector struct{}

func NewHackerNewsCollector() *HackerNewsCollector {
	return &HackerNewsCollector{}
}

func (c *HackerNewsCollector) Name() string {
	return "hackernews"
}

func (c *HackerNewsCollector) Collect(ctx context.Context) ([]domain.Trend, error) {
	var trends []domain.Trend
	var nodes []*struct {
		Title string `json:"title"`
		URL   string `json:"url"`
		Score string `json:"score"`
	}

	// We'll scrape the top 30 items
	err := RunWithTimeout(ctx, 30*time.Second,
		chromedp.Navigate("https://news.ycombinator.com/"),
		chromedp.WaitVisible(".athing"),
		chromedp.Evaluate(`
			Array.from(document.querySelectorAll('.athing')).slice(0, 30).map(row => {
				const titleParams = row.querySelector('.titleline > a');
				const subtext = row.nextElementSibling;
				const scoreSpan = subtext ? subtext.querySelector('.score') : null;
				
				return {
					title: titleParams ? titleParams.innerText : "",
					url: titleParams ? titleParams.href : "",
					score: scoreSpan ? scoreSpan.innerText : "0 points"
				};
			})
		`, &nodes),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scrape HN: %w", err)
	}

	for _, n := range nodes {
		if n.Title == "" {
			continue
		}
		trends = append(trends, domain.Trend{
			ID:        n.URL, // Use URL as ID for deduplication
			Title:     n.Title,
			URL:       n.URL,
			Source:    "hackernews",
			Metadata:  map[string]interface{}{"raw_score": n.Score},
			Timestamp: time.Now(),
		})
	}

	return trends, nil
}
