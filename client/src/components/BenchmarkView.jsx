import { useState } from "react";
import BenchmarkCard from "./BenchmarkCard.jsx";

const IDLE_MODELS = [
  { id: "deepseek-chat",         tier: "weak",   label: "DeepSeek V3" },
  { id: "gemini-2.5-flash-lite", tier: "medium", label: "Gemini 2.5 Flash Lite" },
  { id: "deepseek-reasoner",     tier: "strong", label: "DeepSeek R1" },
];

export default function BenchmarkView({ settings }) {
  const [task, setTask] = useState("");
  const [cardStates, setCardStates] = useState({});     // modelId → result | null
  const [loadingModels, setLoadingModels] = useState(new Set());
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState(null);

  const isRunning = loadingModels.size > 0;

  async function runBenchmark() {
    if (!task.trim() || isRunning) return;

    const collected = {};
    setCardStates({});
    setVerdict(null);
    setError(null);
    setLoadingModels(new Set(IDLE_MODELS.map((m) => m.id)));

    const promises = IDLE_MODELS.map(async (m) => {
      try {
        const res = await fetch("/api/benchmark/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: task.trim(), modelId: m.id, settings }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
        collected[m.id] = data;
        setCardStates((prev) => ({ ...prev, [m.id]: data }));
      } catch (err) {
        const errResult = {
          model: m.id, tier: m.tier, label: m.label,
          error: err.message,
          metrics: { timeMs: 0, totalTokens: 0, cost: 0 },
        };
        collected[m.id] = errResult;
        setCardStates((prev) => ({ ...prev, [m.id]: errResult }));
      } finally {
        setLoadingModels((prev) => {
          const next = new Set(prev);
          next.delete(m.id);
          return next;
        });
      }
    });

    await Promise.all(promises);

    const results = Object.values(collected);
    const successful = results.filter((r) => !r.error);
    if (successful.length === 0) {
      setError("All models failed.");
      return;
    }

    try {
      const judgeRes = await fetch("/api/benchmark/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.trim(), results, settings }),
      });
      const judgeData = await judgeRes.json();
      if (judgeData && !judgeData.error) {
        setVerdict(judgeData);
      } else {
        throw new Error(judgeData?.error || "Judge returned no data");
      }
    } catch (err) {
      console.error("[judge error]", err);
      // Fallback: compute speed/cost winners client-side
      const speedWinner = successful.reduce((a, b) => a.metrics.timeMs < b.metrics.timeMs ? a : b);
      const costWinner  = successful.reduce((a, b) => a.metrics.cost  < b.metrics.cost  ? a : b);
      setVerdict({
        scores: {},
        winners: { speed: speedWinner.model, cost: costWinner.model },
        summary: "Quality evaluation unavailable.",
      });
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
          disabled={isRunning}
        />
        <button
          className="compare-btn"
          onClick={runBenchmark}
          disabled={isRunning || !task.trim()}
        >
          {isRunning ? "Running…" : "Run Benchmark"}
        </button>
      </div>

      {error && <div className="compare-error">{error}</div>}

      <div className="benchmark-grid">
        {IDLE_MODELS.map((m) => (
          <BenchmarkCard
            key={m.id}
            model={m}
            result={cardStates[m.id] ?? null}
            isLoading={loadingModels.has(m.id)}
            winners={winners}
          />
        ))}
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
