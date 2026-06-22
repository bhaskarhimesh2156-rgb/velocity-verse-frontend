import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    if (!backendUrl) {
      console.warn(
        "[VelocityVerse] VITE_BACKEND_URL is not set. " +
        "Phone controller will not work. " +
        "Set it in Vercel → Project Settings → Environment Variables."
      );
    }

    // Connect directly to backend (Render).
    // The Socket.io server is mounted at path "/api/socket.io" on the backend.
    socket = io(backendUrl || "http://localhost:3001", {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected to backend:", backendUrl);
    });
    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
    });
    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
