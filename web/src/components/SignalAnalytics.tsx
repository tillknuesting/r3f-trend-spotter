import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    Cell
} from 'recharts';
import { motion } from 'framer-motion';
import type { Trend } from '../types';
import { topics } from '../lib/topics';

interface SignalAnalyticsProps {
    trends: Trend[];
    onCategorySelect?: (category: string | null) => void;
    selectedCategory?: string | null;
}

export function SignalAnalytics({ trends, onCategorySelect, selectedCategory }: SignalAnalyticsProps) {
    // 1. Calculate Topic Dominance (Radar Chart)

    const radarData = topics.map(topic => {
        let score = 0;
        trends.forEach(t => {
            const text = (t.title + ' ' + t.description).toLowerCase();
            if (topic.keywords.some(k => text.includes(k))) {
                score += t.score;
            }
        });
        return { subject: topic.name, A: Math.round(score), fullMark: 150 };
    });

    // Dynamic scaling for the chart (Calculated but not currently used in axes, kept for future reference or removal)
    // const maxScore = Math.max(...radarData.map(d => d.A));
    // const domainMax = maxScore > 0 ? maxScore * 1.2 : 100;

    // 2. Calculate Intensity Distribution (Bar Chart)
    const buckets = [
        { name: 'Noise (<15)', count: 0, color: '#333' },
        { name: 'Signal (15-25)', count: 0, color: '#666' },
        { name: 'High (25-40)', count: 0, color: '#999' },
        { name: 'Burst (40+)', count: 0, color: '#00F5FF' }, // Cyan
    ];

    trends.forEach(t => {
        if (t.score < 15) buckets[0].count++;
        else if (t.score < 25) buckets[1].count++;
        else if (t.score < 40) buckets[2].count++;
        else buckets[3].count++;
    });

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-4"
        >
            {/* Radar Chart: Topic Dominance */}
            <div className="bg-white border border-gray-200 p-4 relative overflow-hidden group">
                <div className="relative z-10">
                    <h3 className="text-lg font-bold font-sans mb-1 tracking-tight flex items-center gap-2 text-black">
                        SIGNAL RADAR
                    </h3>
                    <p className="text-[10px] text-gray-500 font-mono mb-2">
                        Click on labels to filter the feed. dominance of engineering topics based on keyword frequency.
                    </p>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                                cx="50%"
                                cy="50%"
                                outerRadius="70%"
                                data={radarData}
                                onClick={(data: any) => {
                                    if (data && data.activePayload && data.activePayload[0]) {
                                        const payload = data.activePayload[0].payload;
                                        if (onCategorySelect) {
                                            const isSelected = selectedCategory === payload.subject;
                                            onCategorySelect(isSelected ? null : payload.subject);
                                        }
                                    }
                                }}
                            >
                                <defs>
                                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#00F5FF" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <PolarGrid stroke="#e5e7eb" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={({ payload, x, y, textAnchor }) => {
                                        const isSelected = selectedCategory === payload.value;
                                        return (
                                            <g
                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onCategorySelect) {
                                                        onCategorySelect(isSelected ? null : payload.value);
                                                    }
                                                }}
                                            >
                                                <text
                                                    x={x}
                                                    y={y}
                                                    dy={0}
                                                    textAnchor={textAnchor}
                                                    fill={isSelected ? "#00F5FF" : "#666"}
                                                    fontWeight="bold"
                                                    fontSize={10}
                                                    fontFamily="JetBrains Mono"
                                                >
                                                    {payload.value}
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                                <Radar
                                    name="Signal Strength"
                                    dataKey="A"
                                    stroke="#00F5FF"
                                    strokeWidth={2}
                                    fill="url(#radarGradient)"
                                    fillOpacity={0.6}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #eee' }}
                                    itemStyle={{ color: '#00F5FF', fontFamily: 'JetBrains Mono' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bar Chart: Intensity */}
            <div className="bg-white border border-gray-200 p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent animate-scan" style={{ animationDuration: '2s' }} />
                <div className="absolute top-0 right-0 p-2 text-gray-400 font-mono text-[10px]">INTENSITY_DISTRIBUTION</div>
                <h3 className="text-lg font-bold font-sans mb-1 tracking-tight text-black">
                    SIGNAL INTENSITY
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mb-2">
                    Distribution of signal scores. High &gt; 25 indicates traction. Burst &gt; 40 indicates viral potential.
                </p>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={buckets}>
                            <XAxis
                                dataKey="name"
                                tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #eee' }}
                                itemStyle={{ color: '#000', fontFamily: 'JetBrains Mono' }}
                            />
                            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                                {buckets.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </motion.div>
    );
}
