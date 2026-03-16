import { useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function MessageList({ messages, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <MessageBubble key={index} role={msg.role} text={msg.text} />
      ))}

      {isLoading && (
        <div className="loading-indicator">
          <span>AI is thinking</span>
          <div className="loading-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
