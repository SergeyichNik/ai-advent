import { useState } from "react";
import BenchmarkCard from "./BenchmarkCard.jsx";

const IDLE_MODELS = [
  { id: "deepseek-chat",         tier: "weak",   label: "DeepSeek V3" },
  { id: "gemini-2.5-flash-lite", tier: "medium", label: "Gemini 2.5 Flash Lite" },
  { id: "deepseek-reasoner",     tier: "strong", label: "DeepSeek R1" },
];

export default function BenchmarkView({ settings }) {
  const [task, setTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState(null);

  async function runBenchmark() {
    if (!task.trim() || isLoading) return;
    setIsLoading(true);
    setResults(null);
    setVerdict(null);
    setError(null);

    try {
      const res = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.trim(), settings }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data.results);
      setVerdict(data.verdict);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runBenchmark();
    }
  }

  const winners = verdict?.winners || {};

  return (
    <div className="benchmark-view">
      <div className="compare-input-area">
        <textarea
          className="compare-task-input"
          rows={3}
          placeholder="Enter a task to benchmark across 3 models... (Ctrl+Enter to run)"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="compare-btn"
          onClick={runBenchmark}
          disabled={isLoading || !task.trim()}
        >
          {isLoading ? "Running…" : "Run Benchmark"}
        </button>
      </div>

      {error && <div className="compare-error">{error}</div>}

      <div className="benchmark-grid">
        {IDLE_MODELS.map((m) => {
          const result = results?.find((r) => r.model === m.id) ?? null;
          return (
            <BenchmarkCard
              key={m.id}
              model={m}
              result={result}
              isLoading={isLoading}
              winners={winners}
            />
          );
        })}
      </div>

      {verdict && (
        <div className="benchmark-verdict">
          <div className="benchmark-verdict-header">
            <span className="benchmark-verdict-label">Verdict</span>
            <div className="benchmark-verdict-scores">
              {IDLE_MODELS.map((m) =>
                verdict.scores?.[m.id] !== undefined ? (
                  <span key={m.id} className="benchmark-verdict-score">
                    {m.label}: <strong>{verdict.scores[m.id]}/10</strong>
                  </span>
                ) : null
              )}
            </div>
          </div>
          <div className="benchmark-verdict-text">{verdict.summary}</div>
        </div>
      )}
    </div>
  );
}
