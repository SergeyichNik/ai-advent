import { useState } from "react";
import BenchmarkCard from "./BenchmarkCard.jsx";

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
          placeholder="Enter a task to benchmark across 3 DeepSeek models... (Ctrl+Enter to run)"
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

      {isLoading && (
        <div className="compare-loading">
          <div className="loading-dots">
            <span /><span /><span />
          </div>
          Running across 3 models + judge…
        </div>
      )}

      {error && <div className="compare-error">{error}</div>}

      {results && (
        <>
          <div className="benchmark-grid">
            {results.map((r) => (
              <BenchmarkCard key={r.model} result={r} winners={winners} />
            ))}
          </div>

          {verdict && (
            <div className="benchmark-verdict">
              <div className="benchmark-verdict-header">
                <span className="benchmark-verdict-label">Verdict</span>
                <div className="benchmark-verdict-scores">
                  {results.map((r) =>
                    verdict.scores?.[r.model] !== undefined ? (
                      <span key={r.model} className="benchmark-verdict-score">
                        {r.label}: <strong>{verdict.scores[r.model]}/10</strong>
                      </span>
                    ) : null
                  )}
                </div>
              </div>
              <div className="benchmark-verdict-text">{verdict.summary}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
