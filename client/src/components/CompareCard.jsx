export default function CompareCard({ result, isHighlighted, onHighlight }) {
  const promptText = result.generatedPrompt || result.prompt;

  return (
    <div className={`compare-card${isHighlighted ? " compare-card--highlighted" : ""}`}>
      <div className="compare-card-header">
        <span className="compare-card-strategy">{result.strategy}</span>
        <button
          className="compare-card-star"
          onClick={onHighlight}
          title={isHighlighted ? "Remove highlight" : "Mark as best"}
        >
          {isHighlighted ? "★" : "☆"}
        </button>
      </div>

      <div className="compare-card-section">
        <div className="compare-card-section-label">
          {result.generatedPrompt ? "Generated prompt" : "Prompt used"}
        </div>
        <div className="compare-card-prompt">{promptText}</div>
      </div>

      <div className="compare-card-section">
        <div className="compare-card-section-label">Reply</div>
        <div className="compare-card-reply">{result.reply}</div>
      </div>
    </div>
  );
}
