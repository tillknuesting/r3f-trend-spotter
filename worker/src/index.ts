import puppeteer from '@cloudflare/puppeteer';
import { GitHubTrendsCollector } from './collectors/github';
import { HackerNewsCollector } from './collectors/hackernews';
import { GoogleTrendsCollector } from './collectors/google';
import { RSSCollector } from './collectors/rss';
import { RedditCollector } from './collectors/reddit';
import { DevToCollector } from './collectors/devto';
import { LobstersCollector } from './collectors/lobsters';
import { Scorer } from './analysis/scorer';
import { GitHubCommitter } from './utils/github';

export interface Env {
    BROWSER: puppeteer.BrowserWorker;
    SIGNALS_KV: KVNamespace;
    GITHUB_TOKEN: string;
    OPENAI_API_KEY?: string;
    GITHUB_OWNER: string;
    GITHUB_REPO: string;
    PAGES_DEPLOY_HOOK?: string;
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    // Serve signals.json from KV with caching
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        if (url.pathname === '/api/signals' && request.method === 'GET') {
            const data = await env.SIGNALS_KV.get('signals.json');
            if (!data) {
                return new Response(JSON.stringify({ error: 'No signals data yet' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
                });
            }

            return new Response(data, {
                headers: {
                    'Content-Type': 'application/json',
                    // Cache for 5 minutes at the edge and in the browser
                    'Cache-Control': 'public, max-age=300, s-maxage=300',
                    ...CORS_HEADERS,
                },
            });
        }

        return new Response('Not Found', { status: 404 });
    },

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
            const redditCollector = new RedditCollector();
            const devToCollector = new DevToCollector();
            const lobstersCollector = new LobstersCollector();

            // 3. Collect Data
            const [ghTrends, hnTrends, gTrends, rssTrends, redditTrends, devToTrends, lobstersTrends] = await Promise.all([
                ghCollector.collect(),
                hnCollector.collect(),
                gTrendsCollector.collect(),
                rssCollector.collect(),
                redditCollector.collect(),
                devToCollector.collect(),
                lobstersCollector.collect()
            ]);

            const allTrends = [...ghTrends, ...hnTrends, ...gTrends, ...rssTrends, ...redditTrends, ...devToTrends, ...lobstersTrends];
            console.log(`Total raw trends collected: ${allTrends.length}`);

            if (allTrends.length === 0) {
                console.error('All collectors returned zero trends — possible infrastructure issue. Skipping commit.');
                return;
            }

            // 4. Score Trends
            const scorer = new Scorer();
            const scoredTrends = scorer.scoreTrends(allTrends);
            console.log(`Trends after scoring/deduplication: ${scoredTrends.length}`);

            // 5. Take Top 20 for signals.json
            const topTrends = scoredTrends.slice(0, 20);
            const jsonContent = JSON.stringify({
                generated_at: new Date().toISOString(),
                trends: topTrends,
            }, null, 2);

            // 6. Write to KV (primary — instant for frontend)
            await env.SIGNALS_KV.put('signals.json', jsonContent);
            console.log('Signals data written to KV');

            // 7. Commit to GitHub (backup)
            if (env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO) {
                const committer = new GitHubCommitter(env.GITHUB_TOKEN);
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
