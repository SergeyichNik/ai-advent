import { useState } from "react";

export default function ChatInput({ onSend, isLoading }) {
  const [value, setValue] = useState("");

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
  }

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <form
      className="chat-input-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        className="chat-textarea"
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
        disabled={isLoading}
      />
      <button
        type="submit"
        className="send-button"
        disabled={!canSend}
        aria-label="Send message"
      >
        &#9658;
      </button>
    </form>
  );
}
