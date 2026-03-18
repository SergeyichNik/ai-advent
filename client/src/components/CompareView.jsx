import { useState } from "react";
import CompareCard from "./CompareCard.jsx";

export default function CompareView({ settings }) {
  const [task, setTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [highlightedStrategy, setHighlightedStrategy] = useState(null);

  async function handleCompare() {
    const trimmed = task.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResults(null);
    setHighlightedStrategy(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: trimmed, settings }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCompare();
    }
  }

  function toggleHighlight(strategy) {
    setHighlightedStrategy((prev) => (prev === strategy ? null : strategy));
  }

  const highlighted = results?.find((r) => r.strategy === highlightedStrategy);

  return (
    <div className="compare-view">
      <div className="compare-input-area">
        <textarea
          className="compare-task-input"
          placeholder="Enter your task... (Ctrl+Enter to compare)"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={isLoading}
        />
        <button
          className="compare-btn"
          onClick={handleCompare}
          disabled={!task.trim() || isLoading}
        >
          {isLoading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {isLoading && (
        <div className="compare-loading">
          <div className="loading-dots">
            <span /><span /><span />
          </div>
          Running 4 strategies in parallel...
        </div>
      )}

      {error && <div className="compare-error">Error: {error}</div>}

      {results && (
        <>
          <div className="compare-grid">
            {results.map((r) => (
              <CompareCard
                key={r.strategy}
                result={r}
                isHighlighted={highlightedStrategy === r.strategy}
                onHighlight={() => toggleHighlight(r.strategy)}
              />
            ))}
          </div>
          {highlighted && (
            <div className="compare-summary">
              <span className="compare-summary-label">Best strategy:</span>{" "}
              <strong>{highlighted.strategy}</strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}
