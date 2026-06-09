import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Or use process.env.FRONTEND_URL
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id} (User: ${socket.user._id})`);

    // Handle joining a session room
    socket.on("subscribe_session", (sessionId) => {
      const roomName = `private-session-${sessionId}`;
      socket.join(roomName);
      console.log(`✅ Client ${socket.id} joined room ${roomName}`);
    });

    // Handle leaving a session room
    socket.on("unsubscribe_session", (sessionId) => {
      const roomName = `private-session-${sessionId}`;
      socket.leave(roomName);
      console.log(`❌ Client ${socket.id} left room ${roomName}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized.");
  }
  return io;
};

/**
 * Emit an event to a specific session room.
 * This replaces the old pusher emitToSession.
 *
 * @param {string} sessionId
 * @param {string} event
 * @param {object} data
 */
export const emitToSession = (sessionId, event, data) => {
  if (!io) {
    console.warn("⚠️ Socket.io not initialized, cannot emit event:", event);
    return;
  }
  const roomName = `private-session-${sessionId}`;
  io.to(roomName).emit(event, data);
};
