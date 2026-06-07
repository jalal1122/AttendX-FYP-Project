import Pusher from "pusher";

let pusherInstance = null;

/**
 * Get the initialized Pusher instance.
 * Lazily instantiates the Pusher client to ensure environment variables are loaded.
 */
export const getPusher = () => {
  if (!pusherInstance) {
    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
      console.warn("⚠️ Pusher environment variables are not fully loaded yet.");
    }
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || "ap2",
      useTLS: true,
    });
  }
  return pusherInstance;
};

/**
 * Emit an event to all clients subscribed to a session channel.
 * Drop-in replacement for the old Socket.IO emitToSession().
 *
 * @param {string} sessionId - The session ID (used as channel suffix)
 * @param {string} eventName - The event name (e.g. "attendance:updated")
 * @param {object} payload   - Data to send with the event
 */
export const emitToSession = (sessionId, eventName, payload = {}) => {
  if (!sessionId) return;
  getPusher()
    .trigger(`private-session-${sessionId}`, eventName, payload)
    .catch((err) => {
      console.error(
        `❌ Pusher trigger failed [${eventName}] on session ${sessionId}:`,
        err.message,
      );
    });
};

// Export a Proxy as the default export to maintain compatibility with direct imports
const pusherProxy = new Proxy({}, {
  get(target, prop) {
    return getPusher()[prop];
  }
});

export default pusherProxy;

