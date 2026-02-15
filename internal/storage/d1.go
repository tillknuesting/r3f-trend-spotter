package storage

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"r3f-trend-spotter/pkg/domain"
)

type D1Client struct {
	AccountID  string
	DatabaseID string
	APIToken   string
	BaseURL    string
	HTTPClient *http.Client
}

func NewD1Client() (*D1Client, error) {
	accountID := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	databaseID := os.Getenv("CLOUDFLARE_DATABASE_ID")
	apiToken := os.Getenv("CLOUDFLARE_API_TOKEN")

	if accountID == "" || databaseID == "" || apiToken == "" {
		return nil, fmt.Errorf("missing Cloudflare credentials (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_API_TOKEN)")
	}

	return &D1Client{
		AccountID:  accountID,
		DatabaseID: databaseID,
		APIToken:   apiToken,
		BaseURL:    "https://api.cloudflare.com/client/v4",
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
	}, nil
}

// SaveTrends persists a list of trends to D1.
// It uses an INSERT OR REPLACE strategy to update existing records.
func (c *D1Client) SaveTrends(trends []domain.Trend) error {
	if len(trends) == 0 {
		return nil
	}

	// We'll batch inserts to avoid huge payloads, though D1 HTTP API limit is generous.
	// Let's do it in one go for now, D1 usually handles 100kb+ fine.

	// Construct SQL
	// INSERT OR REPLACE INTO trends (id, title, description, url, source, score, timestamp, summary, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

	sql := "INSERT OR REPLACE INTO trends (id, title, description, url, source, score, timestamp, summary, metadata) VALUES "
	var params []interface{}

	for i, t := range trends {
		if i > 0 {
			sql += ", "
		}
		sql += "(?, ?, ?, ?, ?, ?, ?, ?, ?)"

		metaJSON, _ := json.Marshal(t.Metadata)

		params = append(params,
			t.ID,
			t.Title,
			t.Description,
			t.URL,
			t.Source,
			t.Score,
			t.Timestamp.Format(time.RFC3339),
			t.Summary,
			string(metaJSON),
		)
	}

	return c.Execute(sql, params)
}

// Execute runs a raw SQL query against D1
func (c *D1Client) Execute(sql string, params []interface{}) error {
	url := fmt.Sprintf("%s/accounts/%s/d1/database/%s/query", c.BaseURL, c.AccountID, c.DatabaseID)

	reqBody := map[string]interface{}{
		"sql":    sql,
		"params": params,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.APIToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("D1 API error %d: %s", resp.StatusCode, string(body))
	}

	var d1Resp D1Response
	if err := json.NewDecoder(resp.Body).Decode(&d1Resp); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	if !d1Resp.Success {
		if len(d1Resp.Errors) > 0 {
			return fmt.Errorf("D1 error: %s", d1Resp.Errors[0].Message)
		}
		return fmt.Errorf("D1 query failed (unknown error)")
	}

	return nil
}

type D1Response struct {
	Success bool `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
	Result []struct {
		Meta map[string]interface{} `json:"meta"`
	} `json:"result"`
}
