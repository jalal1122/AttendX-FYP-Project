import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "./api";

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_BASE_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  const token = localStorage.getItem("accessToken");
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socketInstance?.connected) {
    socketInstance.disconnect();
  }
};

export const joinSessionRoom = (sessionId) => {
  const socket = getSocket();
  if (sessionId) {
    socket.emit("session:join", { sessionId });
  }
};

export const leaveSessionRoom = (sessionId) => {
  const socket = getSocket();
  if (sessionId) {
    socket.emit("session:leave", { sessionId });
  }
};

