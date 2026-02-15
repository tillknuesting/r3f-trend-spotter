package domain

import (
	"context"
	"time"
)

// Trend represents a single trend signal collected from a source.
type Trend struct {
	ID          string                 `json:"id"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	URL         string                 `json:"url"`
	Source      string                 `json:"source"`  // "hackernews", "github", "google_trends"
	Score       float64                `json:"score"`   // Normalized score (0-100)
	Summary     string                 `json:"summary"` // LLM-generated summary
	Metadata    map[string]interface{} `json:"metadata"`
	Timestamp   time.Time              `json:"timestamp"`
}

// Collector defines the interface for fetching trends from a specific source.
type Collector interface {
	// Name returns the unique name of the collector.
	Name() string
	// Collect fetches trends from the source.
	Collect(ctx context.Context) ([]Trend, error)
}
