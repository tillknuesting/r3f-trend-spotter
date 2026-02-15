package collectors

import (
	"context"
	"log"
	"time"

	"github.com/chromedp/chromedp"
)

// NewBrowserContext creates a new context with a headless browser.
// It returns the context and a cancel function.
func NewBrowserContext(ctx context.Context, headless bool) (context.Context, context.CancelFunc) {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", headless),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
	)

	allocCtx, _ := chromedp.NewExecAllocator(ctx, opts...)
	ctx, cancel := chromedp.NewContext(allocCtx, chromedp.WithLogf(log.Printf))

	// Ensure the browser is started
	if err := chromedp.Run(ctx); err != nil {
		log.Printf("Failed to start browser: %v", err)
	}

	return ctx, cancel
}

// RunWithTimeout runs a chromedp task with a timeout.
func RunWithTimeout(ctx context.Context, timeout time.Duration, actions ...chromedp.Action) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	return chromedp.Run(ctx, actions...)
}
