import { io } from "socket.io-client";

// FLASK SOCKETIO (LOCAL)
export const socket = io("http://localhost:9000", {
    path: "/socket.io/",
    transports: ["websocket"],
});

// FLASK SOCKETIO (SERVER)
// export const socket = io("wss://lexcode-ph.ddns.net", {
//     path: "/qurious-engagement/socket.io/",
//     transports: ["websocket"],
// });

// Joining Session
export const joinSession = (sessionId: string) => {
    socket.emit("join_session", { session_id: sessionId });
};

//FastAPI SOCKETIO
// export const socket = io("http://localhost:9000", {
//     path: "/socket.io/",
//     transports: ["websocket"],
//     withCredentials: true,
// });