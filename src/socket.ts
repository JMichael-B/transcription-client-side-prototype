import { io } from "socket.io-client";

// FLASK SOCKETIO
// export const socket = io("http://localhost:9000", {
//     autoConnect: false,
// });

//FastAPI SOCKETIO
export const socket = io("http://localhost:9000", {
    path: "/socket.io/",
    transports: ["websocket"],
    withCredentials: true,
});