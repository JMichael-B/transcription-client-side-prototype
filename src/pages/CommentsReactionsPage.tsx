import { useEffect, useState } from "react";
import { socket } from "../socket";

interface Comment {
  session_id: string;
  username: string;
  comment: string;
  translated_comment?: string;  // Add translated_comment
  timestamp: string;
  speaker_language: string;
}

interface Reaction {
  emoji: string;
}

export default function LiveCommentsReactions() {
  const [totalUserCount, setTotalUserCount] = useState<number>(0);

  const [sessionUsers, setSessionUsers] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [sessionStatus, setSessionStatus] = useState<{ [key: string]: boolean }>({});

  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [showTranslated, setShowTranslated] = useState<boolean>(false); // Toggle state

  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Sample Sessions Only [Hardcoded]
  const [sessions] = useState([
    { session_id: "012", name: "Michael's Event" },
    { session_id: "345", name: "Freshten's Event" },
    { session_id: "678", name: "Han's Event" },
  ]);
  const [userName, setUserName] = useState("User1");  // Default userName
  const [sessionId, setSessionId] = useState("012");  // Default session ID
  const [role, setRole] = useState<string>("listener");  // Default role as "listener"
  const [prevRole, setPrevRole] = useState<string>(""); // Track previous role

  useEffect(() => {
    // socket.emit("connect", { userName });                                // Socket.IO already does this automatically. (No need to include)
    // socket.on("connect", () => console.log("Connected to WebSocket"));   // Optional Only (No need to include)
    socket.emit("join_session", { session_id: sessionId, username : userName, role : role});  // Join the session when the component mounts

    socket.on("update_total_users", (data) => {
      setTotalUserCount(data.count);
    });

    socket.on("update_all_session_users", (data) => {
      console.log("all session users received:", data);
      setSessionUsers(data);
    });

    socket.on("update_all_session_status", (data) => {
      console.log("update_all_session_status", data)
      setSessionStatus(data)
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

    const handleBeforeUnload = () => {
      socket.emit("leave_session", { session_id: sessionId, username: userName , role: role});  // Ensures that the leave_session is executed before the window is closed
    };

    window.addEventListener("beforeunload", handleBeforeUnload); 
  
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.off("update_total_users");
      socket.off("recieved_comment");
      socket.off("load_previous_comments");
      socket.off("receive_reaction");
      socket.off("update_all_session_status");
      // socket.off("connect"); // Socket.IO does this automatically.
      // socket.off("disconnect"); // Socket.IO does this automatically.
    };
  }, [sessionId]); // Re-run effect when sessionId or role changed

  // Handle role change: Leave and Rejoin
  useEffect(() => {
    if (role !== prevRole) {
      console.log(`Role changed from ${prevRole} to ${role}. Rejoining session...`);
      socket.emit("leave_session", { session_id: sessionId, username: userName, role: prevRole });
      setTimeout(() => {
        socket.emit("join_session", { session_id: sessionId, username: userName, role });
      }, 500); // Small delay to ensure proper leave before rejoining

      setPrevRole(role); // Update previous role
    }
  }, [role]); // Runs when role changes

  const sendComment = () => {
    if (comment.trim()) {
      const timestamp = new Date().toISOString();
      const newComment: Comment = { 
        session_id: sessionId,
        username: userName, 
        comment: comment, 
        translated_comment: "", // Placeholder (Backend will translate and emit the updated comment)
        timestamp: timestamp,
        speaker_language: "tl" // Hardcoded for now (should be dynamic)
      };
      socket.emit("send_comment", newComment);
      setComment("");
    }
  };

  const sendReaction = (emoji: string) => {
    socket.emit("send_reaction", { session_id: sessionId, emoji });
  };

  const handleJoinSession = (session_id: string) => {
    socket.emit("leave_session", { session_id: sessionId, username: userName });
    setSessionId(session_id);  // Change the active session when a tab is clicked
    // socket.emit("join_session", { session_id, username: userName, role }); // Will Automatically Join Session when session_id is Changed (No Need to Include)
  };

  const handleLaunchEndSession = (session_id: string) => {
    if (sessionStatus[session_id]) {
      socket.emit("end_session", { session_id });
      setSessionId(session_id);  // Change the active session when a tab is clicked

    } else {
      socket.emit("launch_session", { session_id });
      setSessionId(session_id);  // Change the active session when a tab is clicked
      // socket.emit("join_session", { session_id: sessionId, username: userName, role }); // Will Automatically Join Session when session_id is Changed (No Need to Include)
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);  // Update the username when input changes
  };

  return (
    <div>
      {/* Render Total Connected Users */}
      <div style={{ padding: "10px", border: "1px solid #ccc", margin: "5px 0", borderRadius: "5px" }}>
        <strong>Total Connected Users 👥: </strong> {totalUserCount}
        <div>Active Users per Session 👥</div>
          {sessions.map((session) => {
            const userCount = sessionUsers[session.session_id] ? Object.keys(sessionUsers[session.session_id]).length : 0;

            return (
              <div key={session.session_id}>
                <strong>{session.name}</strong>: {userCount}
              </div>
            );
          })}
      </div>

      {/* Username Input & Role Toggle */}
      <div>
        <label>Username: </label>
        <input type="text" value={userName} onChange={handleUsernameChange} placeholder="Enter your username"/>
      </div>
      <div>
        <label>Role: </label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="listener">Listener</option>
          <option value="speaker">Speaker</option>
        </select>
      </div>

      {/* Render Tabs */}
      {role === "listener" ? (
        <div>
          <h2>Sessions to Join:</h2>
          {sessions.map((session) => (
            <button key={session.session_id} onClick={() => handleJoinSession(session.session_id)}>
              {session.name} (session_id: {session.session_id})
            </button>
          ))}
        </div>
      ) : (
        <div>
          <h2>Sessions to Launch/End:</h2>
          {sessions.map((session) => (
            <button key={session.session_id} onClick={() => handleLaunchEndSession(session.session_id)}>
              {sessionStatus[session.session_id]
                ? `End`
                : `Launch ${session.name} (session_id: ${session.session_id})`}
            </button>
          ))}
        </div>
      )}      


      {/* Render the chat for the selected session */}
      <h2>Live Comments (session_id: {sessionId})</h2>
      <button onClick={() => setShowTranslated(!showTranslated)}>
        {showTranslated ? "Show Original" : "Translate"}
      </button>
      <div>
        {comments.map((msg, idx) => (
            <p key={idx}>
              <strong>{msg.username}:</strong>{" "}
              {showTranslated && msg.translated_comment ? msg.translated_comment : msg.comment}   {/* Switches from translated_comment --> comment */}
              <span style={{ fontSize: "0.8rem", color: "gray", marginLeft: "10px" }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </p>
          ))}
      </div>
      <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Type your comment..." />
      <button onClick={sendComment}>Send</button>

      <h2>Live Reactions (Session: {sessionId})</h2>
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
