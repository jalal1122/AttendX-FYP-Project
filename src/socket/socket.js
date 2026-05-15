import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

let ioInstance = null;

const normalizeOrigins = (origins = []) =>
  Array.isArray(origins) ? origins.filter(Boolean) : [];

export const initSocketServer = (httpServer, { allowedOrigins = [] } = {}) => {
  const normalizedOrigins = normalizeOrigins(allowedOrigins);

  ioInstance = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || normalizedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  ioInstance.use(async (socket, next) => {
    try {
      const authToken =
        socket.handshake?.auth?.token ||
        socket.handshake?.headers?.authorization?.replace("Bearer ", "");

      if (!authToken) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(authToken, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded._id).select("_id role name email").lean();
      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = user;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.data?.user?._id?.toString();
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("session:join", ({ sessionId }) => {
      if (sessionId) {
        socket.join(`session:${sessionId}`);
      }
    });

    socket.on("session:leave", ({ sessionId }) => {
      if (sessionId) {
        socket.leave(`session:${sessionId}`);
      }
    });
  });

  return ioInstance;
};

export const getSocketServer = () => ioInstance;

export const emitToSession = (sessionId, eventName, payload = {}) => {
  if (!ioInstance || !sessionId) return;
  ioInstance.to(`session:${sessionId}`).emit(eventName, payload);
};

