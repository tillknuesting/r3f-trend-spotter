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
        { name: "The New Stack", url: "https://thenewstack.io/blog/feed/", category: "ENGINEERING" }
    ];

    async collect(): Promise<Trend[]> {
        const allTrends: Trend[] = [];

        for (const source of this.sources) {
            try {
                console.log(`Fetching RSS from ${source.name}...`);
                const response = await fetch(source.url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const xml = await response.text();
                const $ = cheerio.load(xml, { xmlMode: true });

                $('item, entry').slice(0, 5).each((_, el) => {
                    const title = $(el).find('title').text().trim();
                    const link = $(el).find('link').text() || $(el).find('link').attr('href') || '';
                    const description = $(el).find('description, summary').text().trim().substring(0, 300);
                    const pubDate = $(el).find('pubDate, published, updated').text();

                    if (title && link) {
                        allTrends.push({
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
            } catch (e) {
                console.error(`Failed to fetch RSS from ${source.name}:`, e);
            }
        }

        return allTrends;
    }
}
