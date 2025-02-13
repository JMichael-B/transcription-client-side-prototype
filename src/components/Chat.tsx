import { useEffect, useState } from "react";
import { socket } from "../socket";

export default function LiveChat() {
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [message, setMessage] = useState("");
  const [reactions, setReactions] = useState<{ emoji: string }[]>([]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("receive_reaction", (data) => {
      setReactions((prev) => [...prev, data]);
    });

    socket.on("connect", () => console.log("Connected to WebSocket"));

    return () => {
      socket.off("receive_message");
      socket.off("receive_reaction");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("send_message", { user: "User1", text: message });
      setMessage("");
    }
  };

  const sendReaction = (emoji: string) => {
    socket.emit("send_reaction", { emoji });
  };

  return (
    <div>
      <h2>Live Chat</h2>
      <div>
        {messages.map((msg, idx) => (
          <p key={idx}>
            <strong>{msg.user}:</strong> {msg.text}
          </p>
        ))}
      </div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." />
      <button onClick={sendMessage}>Send</button>

      <h3>Reactions</h3>
      <div>
        <button onClick={() => sendReaction("👍")}>👍</button>
        <button onClick={() => sendReaction("❤️")}>❤️</button>
        <button onClick={() => sendReaction("😂")}>😂</button>
      </div>
      <div>
        {reactions.map((reaction, idx) => (
          <span key={idx} style={{ fontSize: "2rem" }}>{reaction.emoji}</span>
        ))}
      </div>
    </div>
  );
}
