import { Trend } from '../types';

export class DevToCollector {
    async collect(): Promise<Trend[]> {
        try {
            console.log('Fetching top articles from Dev.to...');
            const response = await fetch('https://dev.to/api/articles?top=1&per_page=15', {
                headers: {
                    'User-Agent': 'r3f-trend-spotter/1.0',
                    'Accept': 'application/vnd.forem.api-v1+json'
                }
            });

            if (!response.ok) {
                console.error(`Dev.to API error: ${response.status} ${response.statusText}`);
                return [];
            }

            const data = await response.json() as any[];

            return data.map((item: any) => ({
                id: item.url,
                source: 'devto',
                title: item.title,
                description: item.description || '',
                url: item.url,
                score: 0,
                timestamp: new Date().toISOString(),
                metadata: {
                    reactions: item.public_reactions_count || 0,
                    comments: item.comments_count || 0,
                    tags: item.tag_list?.join(', ') || ''
                }
            }));
        } catch (e) {
            console.error('Dev.to collection failed:', e);
            return [];
        }
    }
}
