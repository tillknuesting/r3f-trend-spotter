import { Trend } from '../types';

export class LobstersCollector {
    async collect(): Promise<Trend[]> {
        try {
            console.log('Fetching hottest stories from Lobste.rs...');
            const response = await fetch('https://lobste.rs/hottest.json', {
                headers: {
                    'User-Agent': 'r3f-trend-spotter/1.0'
                }
            });

            if (!response.ok) {
                console.error(`Lobste.rs API error: ${response.status} ${response.statusText}`);
                return [];
            }

            const data = await response.json() as any[];

            // Map top 15 results
            return data.slice(0, 15).map((item: any) => ({
                id: item.url || item.comments_url,
                source: 'lobsters',
                title: item.title,
                description: item.description || '',
                url: item.url || item.comments_url,
                score: 0,
                timestamp: item.created_at || new Date().toISOString(),
                metadata: {
                    points: item.score || 0,
                    comments: item.comment_count || 0,
                    tags: item.tags?.join(', ') || ''
                }
            }));
        } catch (e) {
            console.error('Lobste.rs collection failed:', e);
            return [];
        }
    }
}
