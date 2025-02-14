import { io } from "socket.io-client";

// FLASK SOCKETIO (LOCAL)
export const socket = io("http://localhost:9000", {
    path: "/socket.io/",
    transports: ["websocket"],
});

// FLASK SOCKETIO (SERVER)
// export const socket = io("wss://lexcode-ph.ddns.net", {
//     path: "/transcription-channel-1/socket.io/",
//     transports: ["websocket"],
// });

//FastAPI SOCKETIO
// export const socket = io("http://localhost:9000", {
//     path: "/socket.io/",
//     transports: ["websocket"],
//     withCredentials: true,
// });