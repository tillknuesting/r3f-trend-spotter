package collectors

import (
	"context"
	"fmt"

	"r3f-trend-spotter/pkg/domain"

	"github.com/mmcdole/gofeed"
)

type LobstersCollector struct{}

func NewLobstersCollector() *LobstersCollector {
	return &LobstersCollector{}
}

func (c *LobstersCollector) Collect(ctx context.Context) ([]domain.Trend, error) {
	fp := gofeed.NewParser()
	// Lobsters RSS for specific tags: golang, rust, ops, linux, performance
	feedURL := "https://lobste.rs/t/golang,rust,ops,linux,performance.rss"

	feed, err := fp.ParseURLWithContext(feedURL, ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to parse lobsters rss: %w", err)
	}

	var trends []domain.Trend
	for _, item := range feed.Items {
		trends = append(trends, domain.Trend{
			ID:          item.GUID,
			Title:       item.Title,
			Description: item.Description,
			URL:         item.Link,
			Source:      "lobsters",
			Timestamp:   *item.PublishedParsed,
			Metadata: map[string]interface{}{
				"categories": item.Categories,
				"author":     item.Author,
			},
		})
	}

	return trends, nil
}
