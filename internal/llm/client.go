package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type Client struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

func NewClient() (*Client, error) {
	apiKey := os.Getenv("ZAI_API_KEY")
	if apiKey == "" {
		apiKey = "3908394db5c54d85ac148de65c062cfa.tt0ZcK6b1Nxj9KCd"
	}

	return &Client{
		apiKey:  apiKey,
		baseURL: "https://open.bigmodel.cn/api/paas/v4",
		client:  &http.Client{Timeout: 60 * time.Second},
	}, nil
}

// GenerateSummary tries multiple models and modes to get a summary.
func (c *Client) GenerateSummary(title, url string) (string, error) {
	// Plan A: GLM-4.7-Flash (Efficient Verified Model)
	summary, err := c.callLLM("glm-4.7-flash", title, url, true)
	if err == nil {
		return summary, nil
	}
	fmt.Printf("LLM fallback (glm-4.7-flash w/ tools failed): %v\n", err)

	// Plan B: GLM-4-Flash (Previous Gen)
	summary, err = c.callLLM("glm-4-flash", title, url, true)
	if err == nil {
		return summary, nil
	}
	fmt.Printf("LLM fallback (glm-4-flash w/ tools failed): %v\n", err)

	// Plan C: GLM-4-Flash Text Only (No Web Search)
	return c.callLLM("glm-4-flash", title, url, false)
}

func (c *Client) callLLM(model, title, url string, useTools bool) (string, error) {
	var prompt string
	if useTools {
		prompt = fmt.Sprintf(`Please browse the following URL and write a concise, engaging 1-sentence summary for a technical blog post.
The audience is Go/Cloud engineers.
Trend Title: %s
URL: %s
If you cannot browse, generate a summary based on the title.`, title, url)
	} else {
		prompt = fmt.Sprintf(`Write a concise, engaging 1-sentence summary for a technical blog post about "%s".
The audience is Go/Cloud engineers.
Generate this based on the title and your knowledge.`, title)
	}

	reqBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"temperature": 0.7,
	}

	if useTools {
		reqBody["tools"] = []map[string]interface{}{
			{
				"type": "web_search",
				"web_search": map[string]interface{}{
					"enable":        true,
					"search_result": true,
				},
			},
		}
	}

	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", c.baseURL+"/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("no response content")
}
