import { io } from "socket.io-client";

const socket = io({
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});

socket.on("connect_error", (err) => {
  // Silent warning for dev environment
  if (import.meta.env.DEV) {
    console.debug("Socket connection state (expected during HMR disabled):", err.message);
  } else {
    console.warn("Socket connection error:", err.message);
  }
});

socket.on("error", (err) => {
  console.error("Socket error:", err);
});

socket.on("connect", () => {
  console.log("Socket connected successfully");
});

export default socket;
