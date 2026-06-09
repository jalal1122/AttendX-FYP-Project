import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

let socketInstance = null;

/**
 * Get or create the Socket.io client instance.
 */
const getSocket = () => {
  if (!socketInstance) {
    const token = localStorage.getItem("accessToken");

    socketInstance = io(API_BASE_URL.replace(/\/api\/v1\/?$/, ""), {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("Socket.io connection error:", err.message);
    });
  }
  return socketInstance;
};

/**
 * Connect to Socket.io (initializes the instance if needed).
 */
export const connectSocket = () => {
  return getSocket();
};

/**
 * Disconnect Socket.io entirely and clear the instance.
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

/**
 * Subscribe to a session's private channel.
 * Returns an object with `bind` and `unbind` methods so existing React code works.
 *
 * @param {string} sessionId
 * @returns {{ bind: Function, unbind: Function }}
 */
export const joinSessionRoom = (sessionId) => {
  if (!sessionId) return null;
  const socket = getSocket();
  
  if (!socket) {
    return {
      bind: () => console.warn(`[Socket Mock] bind skipped for missing socket`),
      unbind: () => console.warn(`[Socket Mock] unbind skipped for missing socket`),
    };
  }

  // Join the server-side room
  socket.emit("subscribe_session", sessionId);

  return {
    bind: (event, callback) => {
      socket.on(event, callback);
    },
    unbind: (event, callback) => {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    },
  };
};

/**
 * Unsubscribe from a session channel.
 *
 * @param {string} sessionId
 */
export const leaveSessionRoom = (sessionId) => {
  if (!sessionId) return;
  const socket = getSocket();
  if (!socket) return;
  socket.emit("unsubscribe_session", sessionId);
};

/**
 * Get an already-subscribed session channel wrapper.
 *
 * @param {string} sessionId
 * @returns {{ bind: Function, unbind: Function } | undefined}
 */
export const getSessionChannel = (sessionId) => {
  if (!sessionId) return undefined;
  const socket = getSocket();
  if (!socket) return undefined;
  
  return {
    bind: (event, callback) => {
      socket.on(event, callback);
    },
    unbind: (event, callback) => {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    },
  };
};
