package collectors

import (
	"context"
	"fmt"
	"strings"
	"time"

	"r3f-trend-spotter/pkg/domain"

	"github.com/chromedp/chromedp"
)

type GitHubTrendsCollector struct{}

func NewGitHubTrendsCollector() *GitHubTrendsCollector {
	return &GitHubTrendsCollector{}
}

func (c *GitHubTrendsCollector) Name() string {
	return "github_trends"
}

func (c *GitHubTrendsCollector) Collect(ctx context.Context) ([]domain.Trend, error) {
	var trends []domain.Trend
	var nodes []*struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		URL         string `json:"url"`
		Stars       string `json:"stars"`
	}

	err := RunWithTimeout(ctx, 30*time.Second,
		chromedp.Navigate("https://github.com/trending"),
		chromedp.WaitVisible("article.Box-row"),
		chromedp.Evaluate(`
			Array.from(document.querySelectorAll('article.Box-row')).map(row => {
				const titleParams = row.querySelector('h2 a');
				const descParams = row.querySelector('p');
				const starsParams = row.querySelector('a[href$="/stargazers"]');
				return {
					title: titleParams ? titleParams.innerText.trim() : "",
					url: titleParams ? titleParams.href : "",
					description: descParams ? descParams.innerText.trim() : "",
					stars: starsParams ? starsParams.innerText.trim() : "0"
				};
			})
		`, &nodes),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scrape GitHub: %w", err)
	}

	for _, n := range nodes {
		if n.Title == "" {
			continue
		}
		// Clean up title (remove " / " if present)
		cleanTitle := strings.ReplaceAll(n.Title, "\n", "")
		cleanTitle = strings.ReplaceAll(cleanTitle, " ", "")

		trends = append(trends, domain.Trend{
			ID:          n.URL,
			Title:       n.Title,
			Description: n.Description,
			URL:         n.URL,
			Source:      "github_trends",
			Metadata:    map[string]interface{}{"stars": n.Stars},
			Timestamp:   time.Now(),
		})
	}

	return trends, nil
}
