import { Trend } from '../types';

export class RedditCollector {
    private subreddits = ['programming', 'machinelearning', 'devops'];

    async collect(): Promise<Trend[]> {
        const allTrends: Trend[] = [];

        for (const sub of this.subreddits) {
            try {
                console.log(`Fetching top posts from r/${sub}...`);
                const response = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=day&limit=5`, {
                    headers: {
                        'User-Agent': 'r3f-trend-spotter/1.0'
                    }
                });

                if (!response.ok) {
                    console.error(`Reddit API error for r/${sub}: ${response.status} ${response.statusText}`);
                    continue;
                }

                const data = await response.json() as any;
                const posts = data?.data?.children || [];

                const mapped = posts.map((child: any) => {
                    const item = child.data;
                    return {
                        id: `https://www.reddit.com${item.permalink}`,
                        source: `reddit_r_${sub}`,
                        title: item.title,
                        description: item.selftext ? item.selftext.substring(0, 300) : '',
                        url: item.url && !item.url.includes('reddit.com') ? item.url : `https://www.reddit.com${item.permalink}`,
                        score: 0,
                        timestamp: new Date().toISOString(),
                        metadata: {
                            upvotes: item.ups || 0,
                            comments: item.num_comments || 0,
                        }
                    };
                });

                allTrends.push(...mapped);
            } catch (e) {
                console.error(`Reddit collection failed for r/${sub}:`, e);
            }
        }

        return allTrends;
    }
}
