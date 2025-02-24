import { useEffect, useState } from "react";
import { socket, joinSession } from "../socket";

interface Comment {
  session_id: string;
  user: string;
  text: string;
  timestamp: string;
}

interface Reaction {
  emoji: string;
}

export default function LiveCommentsReactions() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");

  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Sample Sessions Only
  const [sessions] = useState([
    { session_id: "12345", name: "Session 12345" },
    { session_id: "67789", name: "Session 67789" },
    { session_id: "11111", name: "Session 11111" },
  ]);
  const [username, setUsername] = useState("User1");  // Default username
  const [sessionId, setSessionId] = useState("12345");  // Default session ID

  useEffect(() => {
    joinSession(sessionId);  // Join the session when the component mounts

    socket.on("recieved_comment", (data: Comment) => {
      console.log("Comment received:", data);
      setComments((prev) => [...prev, data]);
    });
  
    socket.on("load_previous_messages", (previousMessages: Comment[]) => {
      console.log("Previous comments loaded:", previousMessages);
      setComments(previousMessages); // Replace messages with loaded history
    });
  
    socket.on("receive_reaction", (data : Reaction) => {
      setReactions((prev) => [...prev, data]);
    });
  
    socket.on("connect", () => console.log("Connected to WebSocket"));
  
    return () => {
      socket.off("recieved_comment");
      socket.off("load_previous_messages");
      socket.off("receive_reaction");
      socket.off("connect");
    };
  }, [sessionId]); // Re-run effect when sessionId changes

  const sendComment = () => {
    if (comment.trim()) {
      const timestamp = new Date().toISOString();
      const newComment: Comment = { 
        session_id: sessionId,
        user: username, 
        text: comment, 
        timestamp : timestamp 
      };
      socket.emit("send_message", newComment);
      setComment("");
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
            style={{ padding: "10px 20px", margin: "0 10px", cursor: "pointer", backgroundColor: session.session_id === sessionId ? "#ddd" : "#f1f1f1", border: "1px solid #ccc", borderRadius: "5px",}}
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
        {comments.map((msg, idx) => (
            <p key={idx}>
              <strong>{msg.user}:</strong> {msg.text} 
              <span style={{ fontSize: "0.8rem", color: "gray", marginLeft: "10px" }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </p>
          ))}
      </div>
      <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Type your comment..." />
      <button onClick={sendComment}>Send</button>

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
