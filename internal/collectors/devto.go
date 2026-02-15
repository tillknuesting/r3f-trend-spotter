package collectors

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"r3f-trend-spotter/pkg/domain"
)

type DevToCollector struct{}

func NewDevToCollector() *DevToCollector {
	return &DevToCollector{}
}

func (c *DevToCollector) Collect(ctx context.Context) ([]domain.Trend, error) {
	// Dev.to API for 'go' and 'kubernetes' tags
	// Docs: https://developers.forem.com/api/v1#tag/articles/operation/getArticles

	tags := []string{"go", "kubernetes"}
	var allTrends []domain.Trend

	client := &http.Client{Timeout: 10 * time.Second}

	for _, tag := range tags {
		url := fmt.Sprintf("https://dev.to/api/articles?tag=%s&top=7", tag) // Top 7 days
		req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		var articles []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&articles); err != nil {
			continue
		}

		for _, a := range articles {
			title, _ := a["title"].(string)
			url, _ := a["url"].(string)
			desc, _ := a["description"].(string)

			// Simple deduplication logic could go here, but analysis engine handles it better
			allTrends = append(allTrends, domain.Trend{
				ID:          fmt.Sprintf("devto-%s", a["id"]),
				Title:       title,
				Description: desc,
				URL:         url,
				Source:      "devto",
				Timestamp:   time.Now(),
				Metadata:    map[string]interface{}{"tag": tag},
			})
		}
	}

	return allTrends, nil
}
