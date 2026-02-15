import { Trend } from '../types';
import puppeteer from '@cloudflare/puppeteer';

export class GoogleTrendsCollector {
    constructor(private browser: puppeteer.Browser) { }

    async collect(): Promise<Trend[]> {
        const page = await this.browser.newPage();
        try {
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            console.log('Navigating to Google Trends...');
            // Note: Google Trends UI is tricky and region-dependent. 
            // This is a simplified version targeting the trending now RSS-ish view or main list.
            await page.goto('https://trends.google.com/trending?geo=US', { waitUntil: 'networkidle0' });

            // Wait for the trending list to load
            await page.waitForSelector('tr', { timeout: 10000 }).catch(() => { });

            const trends = await page.$$eval('tr', (rows) => {
                return rows.map(row => {
                    const titleEl = row.querySelector('.title-link span');
                    const descriptionEl = row.querySelector('.description-text');
                    const volumeEl = row.querySelector('.search-count-value');

                    return {
                        title: titleEl?.textContent?.trim() || '',
                        description: descriptionEl?.textContent?.trim() || '',
                        volume: volumeEl?.textContent?.trim() || 'Unknown',
                        url: 'https://trends.google.com'
                    };
                }).filter(t => t.title !== '');
            });

            return trends.map(t => ({
                source: 'google_trends',
                title: t.title,
                description: t.description || `Trending on Google Search (${t.volume} searches).`,
                url: t.url,
                score: 0,
                timestamp: new Date().toISOString(),
                metadata: {
                    volume: t.volume
                }
            }));

        } catch (e) {
            console.error('Google Trends collection failed:', e);
            return [];
        } finally {
            await page.close();
        }
    }
}
