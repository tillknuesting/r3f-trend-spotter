import { useEffect, useState } from "react";
import { SignalCard } from "./components/SignalCard";
import { SignalAnalytics } from "./components/SignalAnalytics";
import type { SignalData, Trend } from "./types";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

function App() {
  const [data, setData] = useState<SignalData | null>(null);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter trends based on selected category (from Radar Chart)
  const filteredTrends = data ? data.trends.filter(t => {
    if (!selectedCategory) return true;

    // Logic to match trend to category keywords
    const text = (t.title + ' ' + t.description).toLowerCase();
    const topics = {
      'AI/AGENTS': ['ai', 'llm', 'gpt', 'genai', 'rag', 'agent', 'model', 'inference', 'machine learning', 'copilot'],
      'CLOUD/INFRA': ['cloud', 'aws', 'kubernetes', 'k8s', 'terraform', 'docker', 'infrastructure', 'serverless', 'container', 'cluster', 'zvec', 'vector database'],
      'LANGUAGES': ['go ', 'golang', 'rust', 'python', 'typescript', 'javascript', 'wasm', 'c++', 'zig'],
      'DATA/VEC': ['database', 'sql', 'postgres', 'vector', 'data', 'parquet', 'etl', 'storage', 'store', 's3', 'db'],
      'DEVOPS': ['devops', 'ci/cd', 'observability', 'monitoring', 'platform', 'sre', 'pipeline', 'deployment'],
      'SECURITY': ['security', 'vulnerability', 'auth', 'iam', 'hack', 'attack', 'cve', 'privacy']
    };

    const keywords = topics[selectedCategory as keyof typeof topics] || [];
    return keywords.some(k => text.includes(k));
  }) : [];

  const fetchData = async () => {
    setLoading(true);
    try {
      // In production, fetch from the Worker's KV-backed API
      // In development, fall back to the local static file
      const API_URL = import.meta.env.PROD
        ? 'https://r3f-trend-spotter-agent.till-knuesting.workers.dev/api/signals'
        : '/data/signals.json';

      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to load signals data");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Could not load tech signals. Make sure the agent has run.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background text-primary selection:bg-accent selection:text-black pt-1">
      {/* Full Screen Signal Stream Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Moving Scan Beam */}
        <motion.div
          initial={{ top: "-100%" }}
          animate={{ top: "100%" }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 0
          }}
          className="absolute left-0 w-full h-[50vh] bg-gradient-to-b from-transparent via-accent/5 to-transparent shadow-[0_0_20px_rgba(0,245,255,0.05)]"
        />

        {/* Ambient Digital Noise/Grid Effect (Optional, subtle) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Header - R3F Style */}
      <header className="fixed top-1 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          {/* Logo Section */}
          <div className="flex items-center gap-12">
            <a href="/" className="font-sans text-[32px] font-bold tracking-tight text-black hover:opacity-80 transition-opacity">
              R3F
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm font-medium uppercase tracking-wider text-black/60 hover:text-black transition-colors">
                Signals
              </a>
              <a href="https://r3f.co.uk" target="_blank" rel="noreferrer" className="text-sm font-medium uppercase tracking-wider text-black/60 hover:text-black transition-colors">
                Services
              </a>
              <a href="https://r3f.co.uk/blog" target="_blank" rel="noreferrer" className="text-sm font-medium uppercase tracking-wider text-black/60 hover:text-black transition-colors">
                Blog
              </a>
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <span className="hidden font-mono text-xs font-bold text-gray-400 lg:inline-block">
              {data ? new Date(data.generated_at).toLocaleDateString() : "SYNCING..."}
            </span>
            <a
              href="https://r3f.co.uk/contact"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-block bg-black text-white px-5 py-2.5 text-sm font-medium uppercase tracking-wider transition-all hover:bg-accent hover:text-black"
            >
              Contact
            </a>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto mt-24 max-w-7xl px-6 py-12">
        {/* Intro Text with Typing Effect */}
        <div className="mb-12 max-w-3xl">
          <p className="font-mono text-sm uppercase tracking-widest text-accent mb-2">
            R3F / INTELLIGENCE / V3.0
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-xl leading-relaxed text-secondary sm:text-2xl h-24 sm:h-auto"
          >
            {data ? (
              <span className="typing-effect">
                A daily feed of high-performance engineering trends, curated by autonomous agents using <span className="text-black font-bold">scientific scoring</span>.
              </span>
            ) : (
              "Initializing neural link..."
            )}
          </motion.p>
        </div>

        {/* Status Indicators */}
        {loading && !data && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={48} className="animate-spin text-accent" />
          </div>
        )}

        {error && (
          <div className="border-l-4 border-red-500 bg-red-50 p-6 font-mono text-red-600">
            ERROR: {error}
          </div>
        )}

        {data && (
          <>
            {/* Desktop Layout: Items Left, Charts Right */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Left Column: Items */}
              <div className="w-full lg:w-2/3 order-2 lg:order-1">
                {/* Grid */}
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ staggerChildren: 0.05 }}
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2"
                >
                  {filteredTrends.map((trend: Trend) => (
                    <SignalCard key={trend.id} trend={trend} />
                  ))}

                  {filteredTrends.length === 0 && (
                    <div className="col-span-full py-12 text-center font-mono text-gray-400">
                      NO_SIGNALS_FOUND_FOR_QUERY
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Right Column: Analytics */}
              <div className="w-full lg:w-1/3 order-1 lg:order-2 lg:sticky lg:top-24">
                <SignalAnalytics
                  trends={data ? data.trends : []} // Pass ALL trends for global context, or filtered? Usually global context is better for radar, but maybe consistent with feed? 
                  // actually, if we filter the feed, the radar should probably stay static or highlight selection. 
                  // Let's pass all trends so the radar doesn't shrink when filtered.
                  // Wait, "trends" prop in SignalAnalytics is used to build the chart. 
                  // If we pass filteredTrends, the chart will change to show only that category... which might look weird (single spike).
                  // Better to pass ALL trends to SignalAnalytics so the radar shows the full landscape, 
                  // but we highlight the selected category.
                  // Let's change the prop name/usage in SignalAnalytics or just pass 'data.trends'.

                  // Let's pass all trends for the visualization, but maybe highlight the selection.
                  // I'll update SignalAnalytics to accept 'allTrends' or just use 'trends' as the full set.
                  // App.tsx passes 'filteredTrends' right now. I should pass 'data.trends' if I want the chart to remain stable.

                  onCategorySelect={setSelectedCategory}
                  selectedCategory={selectedCategory}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-slate-50 py-16 mt-12">
        <div className="container mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-start gap-12">

          {/* Left Side: Info */}
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-black" />
              <span className="font-bold tracking-tight">R3F ENGINEERING</span>
            </div>

            <div className="font-mono text-[10px] text-gray-500 space-y-4 uppercase leading-relaxed">
              <div>
                <strong className="text-gray-900 border-b border-gray-300 pb-0.5 mr-2 block mb-1 w-max">INTELLIGENCE SOURCES</strong>
                <span className="opacity-80 leading-normal">Hacker News, GitHub Trending, Google Trends, Dev.to, Lobste.rs, Reddit (r/programming, r/machinelearning, r/devops), RSS Feeds (Cloudflare, AWS, Kubernetes, Gopher Academy, The New Stack, InfoQ).</span>
              </div>

              <div>
                <strong className="text-gray-900 border-b border-gray-300 pb-0.5 mr-2 block mb-1 w-max">LAST DATA SYNC</strong>
                <span className="opacity-80 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse"></span>
                  {data ? new Date(data.generated_at).toLocaleString() : "SYNCING..."}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Copyright */}
          <div className="md:text-right mt-auto">
            <p className="font-mono text-[10px] text-gray-400">
              AGGREGATED BY R3F-TREND-SPOTTER-V3<br />
              &copy; {new Date().getFullYear()}
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default App;
