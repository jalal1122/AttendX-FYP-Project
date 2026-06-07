import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

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
  pusher
    .trigger(`private-session-${sessionId}`, eventName, payload)
    .catch((err) => {
      console.error(
        `❌ Pusher trigger failed [${eventName}] on session ${sessionId}:`,
        err.message,
      );
    });
};

export default pusher;
