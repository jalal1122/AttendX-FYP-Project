import Pusher from "pusher";

let pusherInstance;

export const initSocket = () => {
  pusherInstance = new Pusher({
    appId: process.env.PUSHER_APP_ID.trim(),
    key: process.env.PUSHER_KEY.trim(),
    secret: process.env.PUSHER_SECRET.trim(),
    cluster: process.env.PUSHER_CLUSTER.trim(),
    useTLS: true,
  });
  console.log("🔌 Pusher initialized");
  return pusherInstance;
};

export const getIO = () => {
  if (!pusherInstance) {
    throw new Error("Pusher has not been initialized.");
  }
  return pusherInstance;
};

export const authorizeChannel = (socketId, channelName) => {
  if (!pusherInstance) {
    throw new Error("Pusher not initialized");
  }
  return pusherInstance.authorizeChannel(socketId, channelName);
};

/**
 * Emit an event to a specific session room.
 *
 * @param {string} sessionId
 * @param {string} event
 * @param {object} data
 */
export const emitToSession = (sessionId, event, data) => {
  if (!pusherInstance) {
    console.warn("⚠️ Pusher not initialized, cannot emit event:", event);
    return;
  }
  const channelName = `private-session-${sessionId}`;
  pusherInstance.trigger(channelName, event, data);
};
