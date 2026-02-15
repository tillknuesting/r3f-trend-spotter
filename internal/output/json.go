package output

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"r3f-trend-spotter/pkg/domain"
)

type SignalData struct {
	GeneratedAt time.Time      `json:"generated_at"`
	Trends      []domain.Trend `json:"trends"`
}

// GenerateJSONReport creates a signals.json file in the specified directory.
func GenerateJSONReport(trends []domain.Trend, outputDir string) (string, error) {
	data := SignalData{
		GeneratedAt: time.Now(),
		Trends:      trends,
	}

	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal json: %w", err)
	}

	// Ensure directory exists
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	filename := filepath.Join(outputDir, "signals.json")
	if err := os.WriteFile(filename, jsonData, 0644); err != nil {
		return "", fmt.Errorf("failed to write json file: %w", err)
	}

	return filename, nil
}
