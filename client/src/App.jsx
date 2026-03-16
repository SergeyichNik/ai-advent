import { useState, useRef } from "react";
import MessageList from "./components/MessageList.jsx";
import ChatInput from "./components/ChatInput.jsx";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
        body: JSON.stringify({ message: trimmed, history: historyWithoutLast }),
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
      </header>
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
