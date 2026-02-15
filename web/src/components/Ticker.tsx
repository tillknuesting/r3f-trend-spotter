import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface TickerProps {
    text: string;
}

export function Ticker({ text }: TickerProps) {
    return (
        <div className="bg-accent text-black font-mono text-xs font-bold py-1 overflow-hidden relative border-b border-black">
            <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-accent to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-accent to-transparent" />

            <motion.div
                className="flex whitespace-nowrap"
                animate={{ x: [1000, -1000] }}
                transition={{
                    repeat: Infinity,
                    duration: 30,
                    ease: "linear"
                }}
            >
                <span className="flex items-center gap-4 px-4">
                    <AlertCircle size={12} />
                    BREAKING SIGNAL: {text}
                    <span className="opacity-50">///</span>
                    <AlertCircle size={12} />
                    BREAKING SIGNAL: {text}
                    <span className="opacity-50">///</span>
                    <AlertCircle size={12} />
                    BREAKING SIGNAL: {text}
                </span>
            </motion.div>
        </div>
    );
}
