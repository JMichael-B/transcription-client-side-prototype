import { useEffect, useState } from "react";
import { socket } from "../socket";

// HardCoded Parameters
const event_payload = {
    event_id: "eABC",
    event_name: "Sample Event", 
};

// HardCoded Parameters
const session_list_payload = [
    {
        event_id: "eABC",
        session_id: "s012",
        session_name: "Han's Session"
    },
    {
        event_id: "eABC",
        session_id: "s345",
        session_name: "Freshten's Session"
    },
    {
        event_id: "eABC",
        session_id: "s678",
        session_name: "Genesis' Session"
    },
]

const username = "sampleUser";
const role = "listener";

interface Comment {
    event_id?: string;
    session_id: string;
    username: string;
    comment: string;
    translated_comment?: string;
    timestamp: string;
    preferred_language: string;
}

interface Reaction {
    reaction: string;
}

const EventPage: React.FC = () => {
    
    const [joined, setJoined] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [showTranslated, setShowTranslated] = useState(false);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [currentSession, setCurrentSession] = useState<{ event_id: string; session_id: string; session_name: string } | null>(null);
    const [userCounts, setUserCounts] = useState<{ [key: string]: number }>({});
    const [sessionStatus, setSessionStatus] = useState<{ [key: string]: boolean }>({});
    const [currentEventCount, setCurrentEventCount] = useState<boolean | null >(null);
    const [currentsessionStatus, setCurrentSessionStatus] = useState<boolean | null>(null);
    const [currentsessionCount, setCurrentSessionCount] = useState<boolean | null >(null);

    const toggleTranslation = () => {
        setShowTranslated(!showTranslated);
    };

    const handleJoinEvent = () => {
        socket.emit("join_event", { event_id: event_payload.event_id, role: role });
        setJoined(true);
    };

    const handleLeaveEvent = () => {
        socket.emit("leave_event", { event_id: event_payload.event_id, role: role });
        setJoined(false);
    };

    const handleLaunchEndSession = (event_id: string, session_id: string) => {
        //TOGGLING MODE
        if (sessionStatus[session_id]) {
            // End the session
            socket.emit("end_session", { event_id, session_id });
    
            // Shared State Condition between (sessionStatus + currentSessionStatus)
            setSessionStatus((prev) => ({...prev,[session_id]: false,})); // Update the global session status
            if (currentSession?.session_id === session_id) {setCurrentSessionStatus(false);} // Update current session status if applicable
        
        } else {
            // Launch the session
            socket.emit("launch_session", { event_id, session_id });
    
            // Shared State Condition (sessionStatus + currentSessionStatus)
            setSessionStatus((prev) => ({...prev,[session_id]: true,})); // Update the global session status
            if (currentSession?.session_id === session_id) {setCurrentSessionStatus(true);} // Update current session status if applicable
        }
    };

    const handleJoinSession = (event_id: string, session_id: string, session_name: string) => {
        //TOGGLING MODE
        // Leave the current session if one is already joined
        if (currentSession) {
            socket.emit("leave_session", { 
                event_id: currentSession.event_id, 
                session_id: currentSession.session_id, 
                username: username, 
                role: role 
            });
        }
    
        // Join new session
        setCurrentSession({ event_id, session_id, session_name });
        socket.emit("join_session", { 
            event_id: event_id, 
            session_id: session_id, 
            username: username, 
            role: role 
        });
    };

    const handleSendComment = () => {
        if (newComment.trim() && currentSession) {
            const newCommentObj: Comment = {
                event_id: currentSession.event_id,
                session_id: currentSession.session_id,
                username: username,
                comment: newComment,
                timestamp:  new Date().toISOString(),
                preferred_language: "tl",
            };
            socket.emit("send_comment", newCommentObj);
            setNewComment("");
        }
    };

    const sendReaction = (reaction: string) => {
        if (currentSession) {
            socket.emit("send_reaction", { session_id: currentSession.session_id, reaction: reaction });
        }
    };

    useEffect(() => {
        // General Level Response
        socket.on("server_message", (data) => {
            console.log("Server Message:  ", data);
        });
    
        return () => {
            socket.off("server_message");
        };
    }, []);
    
    useEffect(() => {
        // Event Level Responses

        socket.on("count_users_current_event", (data) => {
            console.log("Event Participants:", data);
            setCurrentEventCount(data.count);
        });

        socket.on("count_users_all_session", (data) => {
            console.log("All Session UserCount:", data);
            setUserCounts(data);
        });
    
        socket.on("update_status_all_session", (data) => {
            console.log("All Session Status:", data);
            setSessionStatus(data)
        });
    
        return () => {
            socket.off("count_users_current_event");
            socket.off("count_users_all_session");
            socket.off("update_status_all_session");
        };
    }, []);

    useEffect(() => {
        // Session Level Responses

        socket.on("load_previous_comments", (comments: Comment[]) => {
            console.log("Loaded previous comments:", comments);
            setComments(comments);
        });

        socket.on("count_users_current_session", (data) => {
            console.log("Current Session users:", data);
            setCurrentSessionCount(data.count);
        });

        socket.on("update_status_current_session", (data) => {
            console.log("Current Session Status:", data);
            setCurrentSessionStatus(data.status);
        });

        socket.on("recieve_comment", (comment: Comment) => {
            console.log("Recieved Comment:", comment);
            setComments((prevComments) => [...prevComments, comment]);
        });

        socket.on("receive_reaction", (reaction: Reaction) => {
            console.log("Recieved Reaction:", reaction);
            setReactions((prevReactions) => [...prevReactions, reaction]);
        });

        return () => {
            socket.off("server_message");
            socket.off("update_users_all_session");
            socket.off("update_status_all_session");
            socket.off("load_previous_comments");
            socket.off("count_users_current_session");
            socket.off("update_status_current_session");
            socket.off("recieve_comment");
            socket.off("receive_reaction");
        };
    }, [currentSession]);

  return (
    <div>
        
        {/* All Session Status & UserCount */}
        <div style={{ border: "1px solid white", padding: "10px", marginTop: "10px" }}>
            <h3 style={{ margin: "0 0 0 0" }}>All Sessions Status / Count:</h3>
            {session_list_payload.map((session) => (
                <div key={session.session_id} style={{ border: "1px solid black", padding: "5px", marginTop: "5px" }}>
                    <p>Session Name: {session.session_name}</p>
                    <p>Status: {sessionStatus[session.session_id] ? "🟢" : "---"}</p>
                    <p>Users Count: {userCounts[session.session_id] || 0}</p>
                </div>
            ))}
        </div>

        {/* Join + Leave Event Section */}
        <button onClick={handleJoinEvent}>Join Event: {event_payload.event_name}</button>
        <button onClick={handleLeaveEvent}>Leave Event</button>
        
        {/*  Session Level Responses */}
        {/** Even Page**/}
        {joined && (
        <div>

            {/* Event Title*/}
            <h1>{event_payload.event_name}</h1>
            <h3>⮞ User Count: {currentEventCount ? currentEventCount : "---"}</h3>

            {/* Session List */}
            <h3>◉ Sessions:</h3>

            {/* Session Launch/End */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center" }}>
                <span style={{ minWidth: "50px" }}>Launch/End:</span>
                {session_list_payload.map((session) => (
                    <button key={session.session_id} onClick={() => handleLaunchEndSession(session.event_id, session.session_id)}>
                    {sessionStatus[session.session_id] ? `End` : `Launch ${session.session_name}`}
                    </button>
                ))}
            </div>

            {/* Session Entry Points */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center" }}>
                <span style={{ minWidth: "50px" }}>Join/Leave:</span>
                {session_list_payload.map((session) => (
                    <button key={session.session_id}
                        onClick={() => {
                            if (currentSession?.session_id === session.session_id) {
                                //Toggle Capability
                                // Leave the current session
                                socket.emit("leave_session", { event_id: session.event_id, session_id: session.session_id, username: username, role: role });
                                setCurrentSession(null); // Clear the current session
                            } else {
                                // Join the new session
                                handleJoinSession(session.event_id, session.session_id, session.session_name);
                            }
                        }}
                        style={{ textAlign: "left" }}
                    >
                        {currentSession?.session_id === session.session_id ? "Leave" : `Join ${session.session_name}`}
                    </button>
                ))}
            </div>

            {/* Current Session Status & UserCount */}
            <div style={{ border: "1px solid white", padding: "10px", marginTop: "10px" }}>
                <h3 style={{ margin: "0 0 0 0" }}>{currentSession?.session_name} Status</h3>
                <p>⮞ Status: {currentsessionStatus ? "🟢" : "---"}</p>
                <p>⮞ User Count: {currentsessionCount}</p>
            </div>

            {/* Comment Section */}
            <div style={{ border: "1px solid white", padding: "10px", marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: "0 0 0 0" }}>Comments</h3>
                    <button onClick={toggleTranslation}>
                        {showTranslated ? "Show Original" : "Translate"}
                    </button>
                </div>
                <div style={{ height: "200px", overflowY: "scroll", border: "1px solid black", marginTop: "10px" }}>
                    {comments.map((comment, index) => (
                        <div key={index} style={{ margin: "5px 0" }}>
                            <strong>{comment.username}:</strong> {showTranslated ? comment.translated_comment : comment.comment}
                            <span style={{ fontSize: "0.8rem", color: "gray", marginLeft: "10px" }}>
                                {new Date(comment.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: "10px" }}>
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type your comment"
                    />
                    <button onClick={handleSendComment}>Send</button>
                </div>
            </div>

            {/* Reaction Section */}
            <div style={{ border: "1px solid white", padding: "10px", marginTop: "10px" }}>
                <h3 style={{ margin: "0 0 0 0" }}>Reaction</h3>
                <div>
                    <button onClick={() => sendReaction("👍")}>👍</button>
                    <button onClick={() => sendReaction("❤️")}>❤️</button>
                    <button onClick={() => sendReaction("😂")}>😂</button>
                </div>
                <div style={{ height: "100px", overflowY: "scroll", border: "1px solid black", marginTop: "10px" }}>
                    {reactions.map((reaction, index) => (
                        <div key={index} style={{ margin: "5px 0" }}>
                            <strong>Someone reacted:</strong> {reaction.reaction}
                        </div>
                    ))}
                </div>
            </div>

        </div>
        )}

    </div>
    );
};

export default EventPage;
