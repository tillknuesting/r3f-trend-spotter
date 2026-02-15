package collectors

import (
	"context"
	"fmt"
	"log"
	"time"

	"r3f-trend-spotter/pkg/domain"

	"github.com/chromedp/chromedp"
)

type CNCFCollector struct{}

func NewCNCFCollector() *CNCFCollector {
	return &CNCFCollector{}
}

func (c *CNCFCollector) Collect(ctx context.Context) ([]domain.Trend, error) {
	fmt.Println("Collecting from cncf_blog...")

	// Create a new context with a timeout
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Create a new browser context (reusing the helper if possible, but for now standalone is safer for isolated error handling)
	allocCtx, cancel := chromedp.NewExecAllocator(ctx, append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"),
	)...)
	defer cancel()

	ctx, cancel = chromedp.NewContext(allocCtx)
	defer cancel()

	var nodes []map[string]string

	// CNCF Blog Selector strategy
	// Titles: .blog-item-title a
	// Timestamps: .blog-item-date
	// Summaries: .blog-item-excerpt

	err := chromedp.Run(ctx,
		chromedp.Navigate("https://www.cncf.io/blog/"),
		chromedp.WaitVisible(`.post-archive__item`, chromedp.ByQuery),
		chromedp.Evaluate(`
			Array.from(document.querySelectorAll('.post-archive__item')).slice(0, 10).map(el => {
				const titleEl = el.querySelector('.post-archive__item-title a');
				const dateEl = el.querySelector('.post-archive__item-meta'); // often contains date
				const link = titleEl ? titleEl.href : "";
				const title = titleEl ? titleEl.innerText.trim() : "";
				
				return {
					title: title,
					url: link,
					description: "CNCF Blog Post"
				};
			})
		`, &nodes),
	)

	if err != nil {
		log.Printf("CNCF collection failed: %v", err)
		return nil, err
	}

	var trends []domain.Trend
	for _, n := range nodes {
		if n["title"] == "" {
			continue
		}
		trends = append(trends, domain.Trend{
			ID:          n["url"],
			Title:       n["title"],
			Description: n["description"],
			URL:         n["url"],
			Source:      "cncf_blog",
			Timestamp:   time.Now(), // Date parsing is complex, defaulting to now for simplicity
			Metadata:    make(map[string]interface{}),
		})
	}

	return trends, nil
}
