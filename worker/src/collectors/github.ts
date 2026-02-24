import { Trend } from '../types';
import puppeteer from '@cloudflare/puppeteer';

export class GitHubTrendsCollector {
    constructor(private browser: puppeteer.Browser) { }

    async collect(): Promise<Trend[]> {
        const page = await this.browser.newPage();
        try {
            // Set viewport and user agent
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            console.log('Navigating to GitHub Trends...');
            await page.goto('https://github.com/trending?since=daily', { waitUntil: 'networkidle0' });

            // Selector for trend rows
            const trends = await page.$$eval('article.Box-row', (rows) => {
                return rows.map(row => {
                    const titleEl = row.querySelector('h2 a');
                    const descriptionEl = row.querySelector('p');
                    const metaEls = row.querySelectorAll('div.f6 span');

                    // Extract stars (often in the last span or based on svg icon)
                    // Simple heuristic for now, better parsing needed for robust production
                    const textContent = row.innerText;

                    let stars = 0;
                    const starMatch = textContent.match(/([\d,]+) stars today/);
                    if (starMatch) {
                        stars = parseInt(starMatch[1].replace(/,/g, ''), 10);
                    }

                    const relativeUrl = titleEl?.getAttribute('href') || '';

                    return {
                        title: titleEl?.textContent?.trim()?.replace(/\s+/g, ' ') || 'Unknown Repo',
                        url: `https://github.com${relativeUrl}`,
                        description: descriptionEl?.textContent?.trim() || '',
                        stars,
                        language: row.querySelector('[itemprop="programmingLanguage"]')?.textContent?.trim()
                    };
                });
            });

            return trends.map(t => ({
                id: t.url,
                source: 'github_trends',
                title: t.title,
                description: t.description,
                url: t.url,
                score: 0, // Scored later
                timestamp: new Date().toISOString(),
                metadata: {
                    stars: t.stars,
                    language: t.language
                }
            }));

        } catch (e) {
            console.error('GitHub collection failed:', e);
            return [];
        } finally {
            await page.close();
        }
    }
}
