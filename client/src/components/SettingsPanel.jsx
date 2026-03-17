import { useState } from "react";

const PROVIDER_OPTIONS = [
  { value: "gemini", label: "Google Gemini" },
  { value: "deepseek", label: "DeepSeek" },
];

const FORMAT_OPTIONS = [
  { value: "plain", label: "Plain text" },
  { value: "markdown", label: "Markdown" },
  { value: "json", label: "JSON" },
  { value: "bullet", label: "Bullet points" },
  { value: "concise", label: "Concise" },
];

const MAX_TOKENS_OPTIONS = [
  { value: 128, label: "128" },
  { value: 256, label: "256" },
  { value: 512, label: "512" },
  { value: 1024, label: "1024" },
  { value: 2048, label: "2048" },
  { value: 4096, label: "4096" },
  { value: null, label: "Unlimited" },
];

const STOP_SEQUENCE_SUGGESTIONS = [
  { value: "###", label: "### (section break)" },
  { value: "---", label: "--- (divider)" },
  { value: "\n\n", label: "\\n\\n (double newline)" },
  { value: "END", label: "END" },
  { value: "<END>", label: "<END>" },
];

export default function SettingsPanel({ settings, onChange }) {
  const [customSeq, setCustomSeq] = useState("");

  function addStopSequence(value) {
    if (!value || settings.stopSequences.includes(value) || settings.stopSequences.length >= 5) return;
    onChange({ ...settings, stopSequences: [...settings.stopSequences, value] });
  }

  function removeStopSequence(value) {
    onChange({ ...settings, stopSequences: settings.stopSequences.filter((s) => s !== value) });
  }

  function handleCustomAdd() {
    if (!customSeq.trim()) return;
    addStopSequence(customSeq);
    setCustomSeq("");
  }

  function handleCustomKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomAdd();
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-row">
        <label className="settings-label">Provider</label>
        <select
          className="settings-select"
          value={settings.provider}
          onChange={(e) => onChange({ ...settings, provider: e.target.value })}
        >
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="settings-row">
        <label className="settings-label">Output format</label>
        <select
          className="settings-select"
          value={settings.format}
          onChange={(e) => onChange({ ...settings, format: e.target.value })}
        >
          {FORMAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="settings-row">
        <label className="settings-label">Max tokens</label>
        <select
          className="settings-select"
          value={settings.maxTokens ?? "null"}
          onChange={(e) => {
            const raw = e.target.value;
            onChange({ ...settings, maxTokens: raw === "null" ? null : Number(raw) });
          }}
        >
          {MAX_TOKENS_OPTIONS.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="settings-row settings-row--col">
        <label className="settings-label">Stop sequences <span className="settings-hint">(max 5)</span></label>
        <div className="stop-seq-suggestions">
          {STOP_SEQUENCE_SUGGESTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`seq-chip seq-chip--suggestion${settings.stopSequences.includes(s.value) ? " seq-chip--active" : ""}`}
              onClick={() =>
                settings.stopSequences.includes(s.value)
                  ? removeStopSequence(s.value)
                  : addStopSequence(s.value)
              }
              disabled={!settings.stopSequences.includes(s.value) && settings.stopSequences.length >= 5}
            >
              {s.label}
            </button>
          ))}
        </div>
        {settings.stopSequences.length > 0 && (
          <div className="stop-seq-active">
            {settings.stopSequences.map((s) => (
              <span key={s} className="seq-chip seq-chip--added">
                <code>{s === "\n\n" ? "\\n\\n" : s}</code>
                <button type="button" className="seq-chip-remove" onClick={() => removeStopSequence(s)}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="stop-seq-custom">
          <input
            className="settings-input"
            type="text"
            placeholder="Custom stop sequence..."
            value={customSeq}
            onChange={(e) => setCustomSeq(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            disabled={settings.stopSequences.length >= 5}
          />
          <button
            type="button"
            className="settings-add-btn"
            onClick={handleCustomAdd}
            disabled={!customSeq.trim() || settings.stopSequences.length >= 5}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
