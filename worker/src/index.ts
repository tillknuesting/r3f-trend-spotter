import puppeteer from '@cloudflare/puppeteer';
import { GitHubTrendsCollector } from './collectors/github';
import { HackerNewsCollector } from './collectors/hackernews';
import { GoogleTrendsCollector } from './collectors/google';
import { RSSCollector } from './collectors/rss';
import { Scorer } from './analysis/scorer';
import { GitHubCommitter } from './utils/github';

export interface Env {
    BROWSER: puppeteer.BrowserWorker;
    GITHUB_TOKEN: string;
    OPENAI_API_KEY?: string;
    GITHUB_OWNER: string;
    GITHUB_REPO: string;
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('--- Trend Spotter Agent Run Starts ---');

        // 1. Launch Browser
        const browser = await puppeteer.launch(env.BROWSER);

        try {
            // 2. Initialize Collectors
            const ghCollector = new GitHubTrendsCollector(browser);
            const hnCollector = new HackerNewsCollector(browser);
            const gTrendsCollector = new GoogleTrendsCollector(browser);
            const rssCollector = new RSSCollector();

            // 3. Collect Data
            const [ghTrends, hnTrends, gTrends, rssTrends] = await Promise.all([
                ghCollector.collect(),
                hnCollector.collect(),
                gTrendsCollector.collect(),
                rssCollector.collect()
            ]);

            const allTrends = [...ghTrends, ...hnTrends, ...gTrends, ...rssTrends];
            console.log(`Total raw trends collected: ${allTrends.length}`);

            // 4. Score Trends
            const scorer = new Scorer();
            const scoredTrends = scorer.scoreTrends(allTrends);
            console.log(`Trends after scoring/deduplication: ${scoredTrends.length}`);

            // 5. Take Top 20 for signals.json
            const topTrends = scoredTrends.slice(0, 20);

            // 6. Commit to GitHub
            if (env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO) {
                const committer = new GitHubCommitter(env.GITHUB_TOKEN);
                const jsonContent = JSON.stringify({ trends: topTrends }, null, 2);

                await committer.updateFile(
                    env.GITHUB_OWNER,
                    env.GITHUB_REPO,
                    'web/public/data/signals.json',
                    jsonContent,
                    `chore: automated daily trend update [${new Date().toISOString()}]`
                );
            } else {
                console.warn('Skipping GitHub push: GITHUB_TOKEN or repo info missing in secrets.');
            }

        } catch (e) {
            console.error('Agent execution failed:', e);
        } finally {
            await browser.close();
        }
    },
};
