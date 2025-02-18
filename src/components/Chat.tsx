import { useEffect, useState } from "react";
import { socket, joinSession } from "../socket";

export default function LiveChat() {
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [message, setMessage] = useState("");
  const [reactions, setReactions] = useState<{ emoji: string }[]>([]);
  const [sessionId, setSessionId] = useState("12345");  // Default session ID
  const [username, setUsername] = useState("User1");  // Default username
  const [sessions] = useState([
    { session_id: "12345", name: "Session 12345" },
    { session_id: "67789", name: "Session 67789" },
    { session_id: "11111", name: "Session 11111" },
  ]);

  useEffect(() => {
    joinSession(sessionId);  // Join the session when the component mounts

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
  }, [sessionId]); // Re-run effect when sessionId changes

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("send_message", { session_id: sessionId, user: username, text: message });
      setMessage("");
    }
  };

  const sendReaction = (emoji: string) => {
    socket.emit("send_reaction", { session_id: sessionId, emoji });
  };

  const handleTabClick = (session_id: string) => {
    setSessionId(session_id);  // Change the active session when a tab is clicked
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);  // Update the username when input changes
  };

  return (
    <div>
      {/* Render tabs for different sessions */}
      <div style={{ marginBottom: "20px" }}>
        {sessions.map((session) => (
          <button
            key={session.session_id}
            onClick={() => handleTabClick(session.session_id)}
            style={{
              padding: "10px 20px",
              margin: "0 10px",
              cursor: "pointer",
              backgroundColor: session.session_id === sessionId ? "#ddd" : "#f1f1f1",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          >
            {session.name}
          </button>
        ))}
      </div>

      {/* Render Username Input */}
      <div>
        <label>Username: </label>
        <input
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Enter your username"
        />
      </div>

      {/* Render the chat for the selected session */}
      <h2>Live Chat (Session: {sessionId})</h2>
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
