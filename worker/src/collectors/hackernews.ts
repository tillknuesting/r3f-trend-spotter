import { Trend } from '../types';
import puppeteer from '@cloudflare/puppeteer';

export class HackerNewsCollector {
    constructor(private browser: puppeteer.Browser) { }

    async collect(): Promise<Trend[]> {
        const page = await this.browser.newPage();
        try {
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            console.log('Navigating to Hacker News...');
            await page.goto('https://news.ycombinator.com/', { waitUntil: 'networkidle0' });

            const trends = await page.$$eval('tr.athing', (rows) => {
                return rows.map(row => {
                    const titleEl = row.querySelector('span.titleline > a');
                    const subtext = row.nextElementSibling?.querySelector('td.subtext');

                    let points = 0;
                    const scoreEl = subtext?.querySelector('span.score');
                    if (scoreEl) {
                        points = parseInt(scoreEl.textContent?.replace(' points', '') || '0', 10);
                    }

                    let comments = 0;
                    const commentEls = subtext?.querySelectorAll('a');
                    if (commentEls) {
                        for (const el of Array.from(commentEls)) {
                            if (el.textContent?.includes('comment')) {
                                comments = parseInt(el.textContent.replace(/\s*comment(s)?/, '') || '0', 10);
                            }
                        }
                    }

                    return {
                        title: titleEl?.textContent?.trim() || '',
                        url: titleEl?.getAttribute('href') || '',
                        points,
                        comments,
                    };
                });
            });

            return trends.map(t => {
                const fullUrl = t.url.startsWith('item?id=') ? `https://news.ycombinator.com/${t.url}` : t.url;
                return {
                    id: fullUrl,
                    source: 'hackernews',
                    title: t.title,
                    description: `Hacker News submission with ${t.points} points and ${t.comments} comments.`,
                    url: fullUrl,
                    score: 0,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        points: t.points,
                        comments: t.comments
                    }
                };
            });

        } catch (e) {
            console.error('HN collection failed:', e);
            return [];
        } finally {
            await page.close();
        }
    }
}
