import { ArrowUpRight, Flame, Rocket } from "lucide-react";
import type { Trend } from "../types";
import { cn } from "../lib/utils";

interface SignalCardProps {
    trend: Trend;
}

export function SignalCard({ trend }: SignalCardProps) {
    // Determine if it's a "HOT" or "BURST" item for special styling
    const isHot = trend.title.includes("🔥 HOT") || trend.score > 50;
    const isBurst = trend.title.includes("🚀 BURST");

    // Format Title: Remove the prefixes for cleaner display
    const displayTitle = trend.title
        .replace("[🔥 HOT]", "")
        .replace("[🚀 BURST]", "")
        .replace("[COMBINED]", "")
        .trim();

    return (
        <div className={cn(
            "group relative flex flex-col justify-between border-l-4 p-6 transition-all hover:bg-surface/50",
            "border-y border-r border-gray-200 bg-white", // Sharp borders
            isBurst ? "border-l-accent" : isHot ? "border-l-black" : "border-l-gray-300"
        )}>
            {/* Score Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-1 font-mono text-sm font-bold text-gray-400">
                <span>SCORE:</span>
                <span className={cn(
                    "text-lg",
                    (isHot || isBurst) ? "text-accent" : "text-black"
                )}>
                    {trend.score.toFixed(1)}
                </span>
            </div>

            <div className="mb-4 pr-16">
                {/* Source Pill */}
                <div className="mb-2 flex items-center gap-2">
                    {/* Source Pill Removed by Request */}
                    {isBurst && (
                        <span className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 font-mono text-xs font-bold text-accent uppercase tracking-wider">
                            <Rocket size={12} /> BURST
                        </span>
                    )}
                    {isHot && !isBurst && (
                        <span className="flex items-center gap-1 bg-orange-100 px-2 py-0.5 font-mono text-xs font-bold text-orange-600 uppercase tracking-wider">
                            <Flame size={12} /> HOT
                        </span>
                    )}
                </div>

                {/* Title */}
                <h3 className="font-sans text-xl font-bold leading-tight tracking-tight text-primary">
                    <a href={trend.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                        {displayTitle}
                    </a>
                </h3>
            </div>

            {/* Summary or Description */}
            <div className="mb-6 flex-grow">
                {trend.summary ? (
                    <div className="bg-slate-50 p-3 text-sm italic text-gray-700 border-l-2 border-accent/50">
                        " {trend.summary} "
                    </div>
                ) : (
                    <p className="line-clamp-3 text-sm text-secondary">
                        {trend.description.replace(/<[^>]*>?/gm, "")} {/* Strip HTML tags from description */}
                    </p>
                )}
            </div>

            {/* Footer / Meta */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                <div className="flex flex-wrap gap-2">
                    {/* Extract tags from metadata if available, otherwise heuristics */}
                    {Object.keys(trend.metadata).map((key) => {
                        if (key === "stars" || key === "points" || key === "comments" || key === "raw_score") return null;
                        return (
                            <span key={key} className="text-xs text-gray-400 font-mono lowercase">
                                #{key}
                            </span>
                        );
                    })}
                    {/* Heuristic Tags - Removed source indicators */}
                </div>

                <a
                    href={trend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black hover:text-accent hover:underline decoration-2 underline-offset-4"
                >
                    View Signal <ArrowUpRight size={14} />
                </a>
            </div>
        </div>
    );
}
