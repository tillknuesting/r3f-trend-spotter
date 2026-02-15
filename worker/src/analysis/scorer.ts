import { Trend } from '../types';

export class Scorer {
    private tier1Keywords = [
        "go", "golang", "rust", "kubernetes", "k8s", "performance", "scaling",
        "distributed systems", "architecture", "vector database", "ebpf",
    ];
    private tier2Keywords = [
        "cloud", "aws", "gcp", "azure", "terraform", "devops", "sre",
        "observability", "linux", "database", "platform engineering",
    ];
    private tier3Keywords = [
        "ai", "llm", "agent", "rag", "wasm", "serverless", "generative",
    ];
    private noiseKeywords = [
        "tutorial", "beginner", "basics", "101", "course", "bootcamp", "interview questions",
    ];

    private sourceWeights: Record<string, number> = {
        "lobsters": 1.5,
        "cncf_blog": 1.3,
        "hackernews": 1.2,
        "tech_blogs": 1.1,
        "github_trends": 1.0,
        "google_trends": 0.6,
        "devto": 0.6,
    };

    private minScore = 10.0;

    scoreTrends(trends: Trend[]): Trend[] {
        // 1. Calculate Individual Scores
        const scoredTrends = trends.map(t => ({
            ...t,
            score: this.calculateScientificScore(t)
        }));

        // 2. Anomaly Detection (Boost Bursty Trends)
        const scores = scoredTrends.map(t => t.score);
        const median = this.calculateMedian(scores);
        const mad = this.calculateMAD(scores, median);

        scoredTrends.forEach(t => {
            const zScore = this.calculateModifiedZScore(t.score, median, mad);
            if (zScore > 3.5) {
                t.score *= 2.0;
                t.title = "[🚀 BURST] " + t.title;
            }
        });

        // 3. Deduplicate and Cross-Reference
        const grouped = new Map<string, Trend[]>();
        scoredTrends.forEach(t => {
            const url = t.url.replace(/\/$/, "");
            if (!grouped.has(url)) grouped.set(url, []);
            grouped.get(url)!.push(t);
        });

        const result: Trend[] = [];
        for (const group of grouped.values()) {
            let representative = group[0];
            let combinedScore = 0;
            const sources = new Set<string>();
            let bestScore = -1;

            for (const t of group) {
                sources.add(t.source);
                combinedScore += t.score;
                if (t.score > bestScore) {
                    representative = t;
                    bestScore = t.score;
                }
            }

            if (sources.size > 1) {
                combinedScore *= 1.5;
                if (!representative.title.includes("🚀 BURST")) {
                    representative.title = "[🔥 HOT] " + representative.title;
                }
                representative.source = "COMBINED";
            }

            representative.score = combinedScore;
            if (representative.score >= this.minScore) {
                result.push(representative);
            }
        }

        return result.sort((a, b) => b.score - a.score);
    }

    private calculateScientificScore(t: Trend): number {
        let baseMetricScore = 0.0;
        const meta = t.metadata;

        switch (t.source) {
            case "hackernews":
                baseMetricScore = Math.min(50.0, (meta.points || 0) / 5.0);
                break;
            case "github_trends":
                baseMetricScore = Math.min(50.0, (meta.stars || 0) / 10.0);
                break;
            case "google_trends":
                baseMetricScore = 10.0;
                break;
            case "tech_blogs":
            case "cncf_blog":
                baseMetricScore = 30.0;
                break;
            case "devto":
                baseMetricScore = 15.0;
                break;
            default:
                baseMetricScore = 10.0;
        }

        const ageHours = (Date.now() - new Date(t.timestamp).getTime()) / (1000 * 60 * 60);
        const gravityScore = baseMetricScore / Math.pow(ageHours + 2, 1.8);

        const weight = this.sourceWeights[t.source] || 1.0;
        let totalScore = gravityScore * weight;

        const text = (t.title + " " + t.description).toLowerCase();

        this.tier1Keywords.forEach(k => { if (text.includes(k.toLowerCase())) totalScore += 10; });
        this.tier2Keywords.forEach(k => { if (text.includes(k.toLowerCase())) totalScore += 5; });
        this.tier3Keywords.forEach(k => { if (text.includes(k.toLowerCase())) totalScore += 2; });
        this.noiseKeywords.forEach(k => { if (text.includes(k.toLowerCase())) totalScore -= 15; });

        return Math.max(0, totalScore);
    }

    private calculateMedian(values: number[]): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    private calculateMAD(values: number[], median: number): number {
        if (values.length === 0) return 0;
        const absoluteDeviations = values.map(v => Math.abs(v - median));
        return this.calculateMedian(absoluteDeviations);
    }

    private calculateModifiedZScore(score: number, median: number, mad: number): number {
        if (mad === 0) return 0;
        return 0.6745 * (score - median) / mad;
    }
}
