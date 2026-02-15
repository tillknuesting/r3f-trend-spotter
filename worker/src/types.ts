export interface Trend {
    id?: string;
    source: string;
    title: string;
    description: string;
    url: string;
    score: number;
    summary?: string;
    timestamp: string;
    metadata: Record<string, any>;
}

export interface Collector {
    name: string;
    collect(): Promise<Trend[]>;
}
