function formatCost(cost) {
  if (cost === 0) return "$0.00";
  if (cost < 0.0001) return "<$0.0001";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function Section({ title, children, isLoading, isIdle }) {
  return (
    <div className="bv-section">
      <div className="bv-section-title">{title}</div>
      {isIdle   && <span className="bv-idle-dash">—</span>}
      {isLoading && <div className="loading-dots"><span /><span /><span /></div>}
      {!isIdle && !isLoading && children}
    </div>
  );
}

export default function BenchmarkVerdict({ verdict, isJudgeLoading, cardStates, models }) {
  const isIdle = !verdict && !isJudgeLoading;

  const successfulModels = models.filter(
    (m) => cardStates[m.id] && !cardStates[m.id].error
  );

  const byQuality  = [...successfulModels].sort((a, b) =>
    ((verdict?.scores?.[b.id] ?? 0) - (verdict?.scores?.[a.id] ?? 0))
  );
  const bySpeed    = [...successfulModels].sort((a, b) =>
    cardStates[a.id].metrics.timeMs - cardStates[b.id].metrics.timeMs
  );
  const byResource = [...successfulModels].sort((a, b) =>
    cardStates[a.id].metrics.cost - cardStates[b.id].metrics.cost
  );

  const winners = verdict?.winners || {};

  return (
    <div className={`benchmark-verdict-block${isIdle ? " benchmark-verdict-block--idle" : ""}`}>
      <div className="bv-header">VERDICT</div>

      <Section title="Quality" isIdle={isIdle} isLoading={isJudgeLoading}>
        {byQuality.map((m) => (
          <div
            key={m.id}
            className={`bv-row${winners.quality === m.id ? " bv-row--winner" : ""}`}
          >
            <span className="bv-star">{winners.quality === m.id ? "★" : ""}</span>
            <span className="bv-model-name">{m.label}</span>
            <span className="bv-value">
              {verdict.scores?.[m.id] !== undefined ? `${verdict.scores[m.id]}/10` : "—"}
            </span>
          </div>
        ))}
        {verdict?.summary && (
          <div className="bv-summary">"{verdict.summary}"</div>
        )}
      </Section>

      <Section title="Speed" isIdle={isIdle} isLoading={isJudgeLoading}>
        {bySpeed.map((m) => (
          <div
            key={m.id}
            className={`bv-row${winners.speed === m.id ? " bv-row--winner" : ""}`}
          >
            <span className="bv-star">{winners.speed === m.id ? "★" : ""}</span>
            <span className="bv-model-name">{m.label}</span>
            <span className="bv-value">
              {(cardStates[m.id].metrics.timeMs / 1000).toFixed(1)}s
            </span>
          </div>
        ))}
      </Section>

      <Section title="Resource" isIdle={isIdle} isLoading={isJudgeLoading}>
        {byResource.map((m) => (
          <div
            key={m.id}
            className={`bv-row${winners.cost === m.id ? " bv-row--winner" : ""}`}
          >
            <span className="bv-star">{winners.cost === m.id ? "★" : ""}</span>
            <span className="bv-model-name">{m.label}</span>
            <span className="bv-value">
              {cardStates[m.id].metrics.totalTokens.toLocaleString()} tok
              {" / "}
              {formatCost(cardStates[m.id].metrics.cost)}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}
