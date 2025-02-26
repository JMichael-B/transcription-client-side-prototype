import { useEffect, useState } from "react";
import { socket, joinSession } from "../socket";

interface Comment {
  session_id: string;
  username: string;
  comment: string;
  timestamp: string;
}

interface Reaction {
  emoji: string;
}

export default function LiveCommentsReactions() {
  const [totalUserCount, setTotalUserCount] = useState<number>(0);

  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");

  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Sample Sessions Only [Hardcoded]
  const [sessions] = useState([
    { session_id: "12345", name: "Session 12345" },
    { session_id: "67789", name: "Session 67789" },
    { session_id: "11111", name: "Session 11111" },
  ]);
  const [userName, setUserName] = useState("User1");  // Default userName
  const [sessionId, setSessionId] = useState("12345");  // Default session ID

  useEffect(() => {
    // socket.emit("connect", { userName });                                // Socket.IO already does this automatically. (No need to include)
    // socket.on("connect", () => console.log("Connected to WebSocket"));   // Optional Only (No need to include)
    joinSession(sessionId);  // Join the session when the component mounts

    socket.on("update_total_users", (data) => {
      setTotalUserCount(data.count);
    });

    socket.on("recieved_comment", (data: Comment) => {
      console.log("Comment received:", data);
      setComments((prev) => [...prev, data]);
    });
  
    socket.on("load_previous_comments", (previousComments: Comment[]) => {
      console.log("Previous comments loaded:", previousComments);
      setComments(previousComments); // Replace comments with loaded history
    });
  
    socket.on("receive_reaction", (data : Reaction) => {
      setReactions((prev) => [...prev, data]);
    });
  
    return () => {
      socket.off("update_total_users");
      socket.off("recieved_comment");
      socket.off("load_previous_comments");
      socket.off("receive_reaction");
      // socket.off("connect"); // Socket.IO does this automatically.
      // socket.off("disconnect"); // Socket.IO does this automatically.
    };
  }, [sessionId]); // Re-run effect when sessionId changes

  const sendComment = () => {
    if (comment.trim()) {
      const timestamp = new Date().toISOString();
      const newComment: Comment = { 
        session_id: sessionId,
        username: userName, 
        comment: comment, 
        timestamp : timestamp 
      };
      socket.emit("send_comment", newComment);
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
    setUserName(e.target.value);  // Update the username when input changes
  };

  return (
    <div>
      <div>
        <strong>Total Connected Users:</strong> {totalUserCount}
      </div>

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
          value={userName}
          onChange={handleUsernameChange}
          placeholder="Enter your username"
        />
      </div>

      {/* Render the chat for the selected session */}
      <h2>Live Chat (Session: {sessionId})</h2>
      <div>
        {comments.map((msg, idx) => (
            <p key={idx}>
              <strong>{msg.username}:</strong> {msg.comment} 
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
