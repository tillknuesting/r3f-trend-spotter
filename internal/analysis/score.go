package analysis

import (
	"fmt"
	"math" // Not strictly needed for stats imports but kept for standard lib
	"strconv"
	"strings"
	"time"

	"r3f-trend-spotter/pkg/domain"
)

// Scorer analyzes and scores trends based on various heuristics.
type Scorer struct {
	Tier1Keywords []string // Core Niche
	Tier2Keywords []string // Infra/Cloud
	Tier3Keywords []string // Emerging
	NoiseKeywords []string // Penalties
	SourceWeights map[string]float64
	MinScore      float64
	Analyzer      *TextAnalyzer
}

func NewScorer() *Scorer {
	return &Scorer{
		Tier1Keywords: []string{
			"go", "golang", "rust", "kubernetes", "k8s", "performance", "scaling",
			"distributed systems", "architecture", "vector database", "ebpf",
		},
		Tier2Keywords: []string{
			"cloud", "aws", "gcp", "azure", "terraform", "devops", "sre",
			"observability", "linux", "database", "platform engineering",
		},
		Tier3Keywords: []string{
			"ai", "llm", "agent", "rag", "wasm", "serverless", "generative",
		},
		NoiseKeywords: []string{
			"tutorial", "beginner", "basics", "101", "course", "bootcamp", "interview questions",
		},
		SourceWeights: map[string]float64{
			"lobsters":      1.5,
			"cncf_blog":     1.3,
			"hackernews":    1.2,
			"tech_blogs":    1.1,
			"github_trends": 1.0,
			"google_trends": 0.6,
			"devto":         0.6,
		},
		MinScore: 10.0,
	}
}

// ScoreTrends processes a list of trends and assigns a unified score.
func (s *Scorer) ScoreTrends(trends []domain.Trend) []domain.Trend {
	var scored []domain.Trend

	// 0. Build Text Corpus for BM25
	var corpus []string
	for _, t := range trends {
		corpus = append(corpus, t.Title+" "+t.Description)
	}
	s.Analyzer = NewTextAnalyzer(corpus)

	// 1. Calculate Individual Scores (Base + Gravity + BM25)
	for i := range trends {
		trends[i].Score = s.calculateScientificScore(trends[i])
	}

	// 2. Anomaly Detection (Boost Bursty Trends)
	// Calculate MAD of scores
	var allScores []float64
	for _, t := range trends {
		allScores = append(allScores, t.Score)
	}

	median := CalculateMedian(allScores)
	mad := CalculateMAD(allScores)

	// Apply Boost for Statistical Outliers (Modified Z-Score > 3.5)
	for i := range trends {
		zScore := CalculateModifiedZScore(trends[i].Score, median, mad)
		if zScore > 3.5 {
			trends[i].Score *= 2.0 // Massive boost for true anomalies
			trends[i].Title = "[🚀 BURST] " + trends[i].Title
		}
	}

	// 3. Deduplicate and Cross-Reference
	grouped := make(map[string][]domain.Trend)
	for _, t := range trends {
		url := strings.TrimRight(t.URL, "/")
		grouped[url] = append(grouped[url], t)
	}

	for _, group := range grouped {
		if len(group) == 0 {
			continue
		}

		representative := group[0]
		combinedScore := 0.0
		sources := make(map[string]bool)
		combinedDesc := ""
		bestScore := -1.0

		for _, t := range group {
			sources[t.Source] = true
			combinedScore += t.Score
			if t.Score > bestScore {
				representative = t
				bestScore = t.Score
			}
			if t.Source == "hackernews" && representative.ID != t.ID {
				combinedDesc += fmt.Sprintf(" [HN: %s]", t.Metadata["raw_score"])
			}
		}

		if len(sources) > 1 {
			combinedScore *= 1.5 // Still apply cross-source multiplier
			if !strings.Contains(representative.Title, "🚀 BURST") {
				representative.Title = "[🔥 HOT] " + representative.Title
			}
			representative.Source = "COMBINED"
		}

		representative.Score = combinedScore
		representative.Description += combinedDesc

		if representative.Score >= s.MinScore {
			scored = append(scored, representative)
		}
	}

	return s.sortByScore(scored)
}

func (s *Scorer) calculateScientificScore(t domain.Trend) float64 {
	// A. Base Metric Score (0-50)
	baseMetricScore := 0.0
	switch t.Source {
	case "hackernews":
		raw := getFloat(t.Metadata, "raw_score")
		baseMetricScore = math.Min(50.0, raw/5.0)
	case "github_trends":
		raw := getFloat(t.Metadata, "stars")
		baseMetricScore = math.Min(50.0, raw/10.0)
	case "google_trends":
		raw := t.Score
		if raw > 0 {
			baseMetricScore = math.Min(50.0, math.Log10(raw)*10)
		}
	case "lobsters":
		baseMetricScore = 20.0
	case "tech_blogs", "cncf_blog":
		baseMetricScore = 30.0 // Editorial trust
	case "devto":
		baseMetricScore = 15.0
	}

	// B. Gravity Decay (Newton's Law of Cooling)
	// Instead of linear boost, we decay the base score by age.
	ageHours := time.Since(t.Timestamp).Hours()
	gravityScore := CalculateGravity(baseMetricScore, ageHours)

	// C. Apply Source Weight
	weight, ok := s.SourceWeights[t.Source]
	if !ok {
		weight = 1.0
	}
	weightedScore := gravityScore * weight

	// D. BM25 Text Relevance
	// We treat our keyword tiers as queries.
	// Tier 1 is "Query 1", Tier 2 is "Query 2", etc.
	// We sum the BM25 scores for each tier, weighted by importance.

	docContent := t.Title + " " + t.Description

	bm25Score := 0.0
	bm25Score += s.Analyzer.ScoreBM25(docContent, s.Tier1Keywords) * 2.0 // Weight Tier 1 heavily
	bm25Score += s.Analyzer.ScoreBM25(docContent, s.Tier2Keywords) * 1.0
	bm25Score += s.Analyzer.ScoreBM25(docContent, s.Tier3Keywords) * 0.5

	// Penalize noise
	noiseScore := s.Analyzer.ScoreBM25(docContent, s.NoiseKeywords) * 2.0

	totalScore := weightedScore + bm25Score - noiseScore

	// Ensure non-negative
	if totalScore < 0 {
		return 0
	}

	return totalScore
}

// Keep helpers (getFloat, sortByScore)
func getFloat(meta map[string]interface{}, key string) float64 {
	val, ok := meta[key]
	if !ok {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case string:
		v = strings.ReplaceAll(v, ",", "")
		v = strings.ReplaceAll(v, " points", "")
		v = strings.ReplaceAll(v, " stars", "")
		f, _ := strconv.ParseFloat(v, 64)
		return f
	default:
		return 0
	}
}

func (s *Scorer) sortByScore(trends []domain.Trend) []domain.Trend {
	n := len(trends)
	for i := 0; i < n-1; i++ {
		for j := 0; j < n-i-1; j++ {
			if trends[j].Score < trends[j+1].Score {
				trends[j], trends[j+1] = trends[j+1], trends[j]
			}
		}
	}
	return trends
}
