import { io } from "socket.io-client";

// FLASK SOCKETIO (LOCAL)
// export const socket = io("http://localhost:9000", {
//     path: "/socket.io/",
//     transports: ["websocket"],
// });

// FLASK SOCKETIO (PH SERVER)
// export const socket = io("wss://qurious.ddns.net", {
//     path: "/qurious-engagement/socket.io/",
//     transports: ["websocket"],
// });

// FLASK SOCKETIO (AWS SERVER)
export const socket = io("https://api.qurious.lexcodeapi.com", {
    path: "/engagement/socket.io/",
    transports: ["websocket"],
});