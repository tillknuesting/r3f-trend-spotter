import OpenAI from 'openai';
import { Trend } from '../types';

export class LLMAnalyzer {
    private client: OpenAI;

    constructor(apiKey: string, baseURL?: string) {
        console.log(`LLM Client initialized with Base URL: ${baseURL || 'https://api.openai.com/v1'}`);
        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL || 'https://api.openai.com/v1',
        });
    }

    async summarize(trend: Trend): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: 'glm-4-flash',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a technical analyst focusing on high-performance cloud engineering, Go, Rust, and infrastructure.'
                    },
                    {
                        role: 'user',
                        content: `Summarize the following tech trend in exactly ONE concise, professional sentence. Highlight why it matters for high-performance cloud engineering or Go/Rust development. Trend: ${trend.title} - ${trend.description}`
                    }
                ],
                max_tokens: 100,
                temperature: 0.3,
            });

            return response.choices[0]?.message?.content?.trim() || '';
        } catch (e: any) {
            console.error(`LLM Summarization failed for ${trend.title}:`, e.message || e);
            return '';
        }
    }
}
