export default function MessageBubble({ role, text }) {
  return (
    <div className={`message-bubble ${role}`}>
      <p className="bubble-text">{text}</p>
    </div>
  );
}
