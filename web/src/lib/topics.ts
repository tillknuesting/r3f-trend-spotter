export const topics = [
    { name: 'AI/AGENTS', keywords: ['ai', 'llm', 'gpt', 'genai', 'rag', 'agent', 'model', 'inference', 'machine learning', 'copilot'] },
    { name: 'CLOUD/INFRA', keywords: ['cloud', 'aws', 'kubernetes', 'k8s', 'terraform', 'docker', 'infrastructure', 'serverless', 'container', 'cluster', 'zvec', 'vector database'] },
    { name: 'LANGUAGES', keywords: ['go ', 'golang', 'rust', 'python', 'typescript', 'javascript', 'wasm', 'c++', 'zig'] },
    { name: 'DATA/VEC', keywords: ['database', 'sql', 'postgres', 'vector', 'data', 'parquet', 'etl', 'storage', 'store', 's3', 'db'] },
    { name: 'DEVOPS', keywords: ['devops', 'ci/cd', 'observability', 'monitoring', 'platform', 'sre', 'pipeline', 'deployment'] },
    { name: 'SECURITY', keywords: ['security', 'vulnerability', 'auth', 'iam', 'hack', 'attack', 'cve', 'privacy'] },
];

export function getMatchedTopics(text: string): string[] {
    const lowerText = text.toLowerCase();
    const matched = [];
    for (const topic of topics) {
        if (topic.keywords.some(k => lowerText.includes(k))) {
            matched.push(topic.name);
        }
    }
    return matched;
}
