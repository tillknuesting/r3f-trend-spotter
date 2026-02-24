import { Trend } from '../types';
import * as cheerio from 'cheerio';

interface Source {
    name: string;
    url: string;
    category: string;
}

export class RSSCollector {
    private sources: Source[] = [
        { name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/", category: "INFRA" },
        { name: "AWS News", url: "https://aws.amazon.com/blogs/aws/feed/", category: "CLOUD" },
        { name: "Kubernetes Blog", url: "https://kubernetes.io/feed.xml", category: "INFRA" },
        { name: "Gopher Academy", url: "https://blog.gopheracademy.com/index.xml", category: "LANGUAGES" },
        { name: "The New Stack", url: "https://thenewstack.io/blog/feed/", category: "ENGINEERING" },
        { name: "InfoQ Architecture", url: "https://feed.infoq.com", category: "ARCHITECTURE" }
    ];

    async collect(): Promise<Trend[]> {
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        const fetchSource = async (source: Source): Promise<Trend[]> => {
            try {
                console.log(`Fetching RSS from ${source.name}...`);
                const response = await fetch(source.url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const xml = await response.text();
                const $ = cheerio.load(xml, { xmlMode: true });
                const trends: Trend[] = [];

                $('item, entry').slice(0, 5).each((_, el) => {
                    const title = $(el).find('title').text().trim();
                    const link = $(el).find('link').text() || $(el).find('link').attr('href') || '';
                    const description = $(el).find('description, summary').text().trim().substring(0, 300);
                    const pubDate = $(el).find('pubDate, published, updated').text();

                    // Skip items older than 7 days
                    if (pubDate) {
                        const pubTime = new Date(pubDate).getTime();
                        if (!isNaN(pubTime) && Date.now() - pubTime > SEVEN_DAYS_MS) {
                            return; // skip stale items
                        }
                    }

                    if (title && link) {
                        trends.push({
                            id: link,
                            source: 'tech_blogs',
                            title,
                            description: description || 'No description available.',
                            url: link,
                            score: 0,
                            timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                            metadata: {
                                author: source.name,
                                category: source.category
                            }
                        });
                    }
                });
                return trends;
            } catch (e) {
                console.error(`Failed to fetch RSS from ${source.name}:`, e);
                return [];
            }
        };

        const results = await Promise.allSettled(this.sources.map(s => fetchSource(s)));
        const allTrends: Trend[] = [];
        for (const result of results) {
            if (result.status === 'fulfilled') {
                allTrends.push(...result.value);
            }
        }
        return allTrends;
    }
}
