import { useState } from "react";

const MODEL_LINKS = {
  "deepseek-chat":         "https://www.deepseek.com/v3",
  "deepseek-reasoner":     "https://www.deepseek.com/r1",
  "gemini-2.5-flash-lite": "https://deepmind.google/technologies/gemini/flash/",
};

function formatCost(cost) {
  if (cost === 0) return "$0.00";
  if (cost < 0.0001) return "<$0.0001";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export default function BenchmarkCard({ model, result, isLoading, winners }) {
  const [showThinking, setShowThinking] = useState(false);
  const { id, tier, label } = model;

  if (!result) {
    return (
      <div className="benchmark-card benchmark-card--idle">
        <div className="benchmark-card-header">
          <div className="benchmark-card-title">
            <span className={`benchmark-tier benchmark-tier--${tier}`}>{tier.toUpperCase()}</span>
            <a
              className="benchmark-card-model"
              href={MODEL_LINKS[id]}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label} ↗
            </a>
          </div>
        </div>
        {isLoading ? (
          <div className="loading-dots"><span /><span /><span /></div>
        ) : (
          <p className="benchmark-card-idle-text">Run benchmark to see results</p>
        )}
        <div className="benchmark-metrics benchmark-metrics--idle">
          <span>⏱ —</span>
          <span>🪙 —</span>
          <span>—</span>
        </div>
      </div>
    );
  }

  const { answer, thinking, error, metrics } = result;
  const isQualityWinner = winners?.quality === id;
  const isSpeedWinner   = winners?.speed   === id;
  const isCostWinner    = winners?.cost    === id;

  return (
    <div className={`benchmark-card${error ? " benchmark-card--error" : ""}`}>
      <div className="benchmark-card-header">
        <div className="benchmark-card-title">
          <span className={`benchmark-tier benchmark-tier--${tier}`}>{tier.toUpperCase()}</span>
          <a
            className="benchmark-card-model"
            href={MODEL_LINKS[id]}
            target="_blank"
            rel="noopener noreferrer"
          >
            {label} ↗
          </a>
        </div>
        <div className="benchmark-card-badges">
          {isQualityWinner && <span className="benchmark-badge benchmark-badge--quality">★ Quality</span>}
          {isSpeedWinner   && <span className="benchmark-badge benchmark-badge--speed">⚡ Speed</span>}
          {isCostWinner    && <span className="benchmark-badge benchmark-badge--cost">💰 Cost</span>}
        </div>
      </div>

      {error ? (
        <div className="benchmark-card-error">{error}</div>
      ) : (
        <>
          <div className="benchmark-card-answer">{answer}</div>
          {thinking && (
            <div className="benchmark-thinking">
              <button
                className="benchmark-thinking-toggle"
                onClick={() => setShowThinking((v) => !v)}
              >
                {showThinking ? "▼" : "▶"} View reasoning ({thinking.length.toLocaleString()} chars)
              </button>
              {showThinking && (
                <div className="benchmark-thinking-content">{thinking}</div>
              )}
            </div>
          )}
        </>
      )}

      <div className="benchmark-metrics">
        <span title="Generation time">⏱ {(metrics.timeMs / 1000).toFixed(1)}s</span>
        <span title="Total tokens">🪙 {metrics.totalTokens.toLocaleString()} tok</span>
        <span title="Estimated cost">{formatCost(metrics.cost)}</span>
      </div>
    </div>
  );
}
