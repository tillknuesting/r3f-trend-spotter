export interface Trend {
    id: string;
    title: string;
    description: string;
    url: string;
    source: string;
    score: number;
    timestamp: string;
    summary?: string;
    metadata: Record<string, any>;
}

export interface SignalData {
    generated_at: string;
    trends: Trend[];
}
