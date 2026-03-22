import { useState, useRef } from "react";
import MessageList from "./components/MessageList.jsx";
import ChatInput from "./components/ChatInput.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import CompareView from "./components/CompareView.jsx";
import BenchmarkView from "./components/BenchmarkView.jsx";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = sessionStorage.getItem("chat-settings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      format: "plain",
      maxTokens: 1024,
      stopSequences: [],
      provider: "deepseek",
      systemPrompt: "",
      temperature: 1.0,
    };
  });

  function handleSettingsChange(next) {
    setSettings(next);
    try {
      sessionStorage.setItem("chat-settings", JSON.stringify(next));
    } catch {}
  }
  const [view, setView] = useState("chat");
  const history = useRef([]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);

    history.current = [
      ...history.current,
      { role: "user", parts: [{ text: trimmed }] },
    ];

    setIsLoading(true);

    try {
      const historyWithoutLast = history.current.slice(0, -1);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: historyWithoutLast, settings }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
      history.current = [
        ...history.current,
        { role: "model", parts: [{ text: data.reply }] },
      ];
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "error", text: `Error: ${err.message}` },
      ]);
      history.current = history.current.slice(0, -1);
    } finally {
      setIsLoading(false);
    }
  }

  const title = import.meta.env.VITE_APP_TITLE || "AI Chat";

  return (
    <div className="app">
      <header className="app-header">
        <h1>{title}</h1>
        <div className="header-tabs">
          <button
            className={`header-tab${view === "chat" ? " header-tab--active" : ""}`}
            onClick={() => setView("chat")}
          >
            Chat
          </button>
          <button
            className={`header-tab${view === "compare" ? " header-tab--active" : ""}`}
            onClick={() => setView("compare")}
          >
            Compare
          </button>
          <button
            className={`header-tab${view === "benchmark" ? " header-tab--active" : ""}`}
            onClick={() => setView("benchmark")}
          >
            Benchmark
          </button>
        </div>
        <button
          className="settings-toggle"
          onClick={() => setShowSettings((v) => !v)}
          title="Settings"
          aria-label="Toggle settings"
        >
          ⚙
        </button>
      </header>
      {showSettings && <SettingsPanel settings={settings} onChange={handleSettingsChange} />}
      {view === "chat" ? (
        <>
          <MessageList messages={messages} isLoading={isLoading} />
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </>
      ) : view === "compare" ? (
        <CompareView settings={settings} />
      ) : (
        <BenchmarkView settings={settings} />
      )}
    </div>
  );
}
