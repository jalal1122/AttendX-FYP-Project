import Pusher from "pusher-js";
import { API_BASE_URL } from "./api";

let pusherInstance = null;

/**
 * Get or create the Pusher client instance.
 * The instance auto-connects on creation, so there is no need
 * for an explicit connect step like Socket.IO required.
 */
const getPusher = () => {
  if (!pusherInstance) {
    const token = localStorage.getItem("accessToken");

    pusherInstance = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      channelAuthorization: {
        endpoint: `${API_BASE_URL.replace(/\/api\/v1\/?$/, "")}/api/v1/pusher/auth`,
        transport: "ajax",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }
  return pusherInstance;
};

/**
 * Connect to Pusher (initialises the instance if needed).
 * Kept for API compatibility with the old socket service.
 */
export const connectSocket = () => {
  return getPusher();
};

/**
 * Disconnect Pusher entirely and clear the instance.
 */
export const disconnectSocket = () => {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
};

/**
 * Subscribe to a session's private channel.
 * Returns the Pusher Channel object so callers can bind events.
 *
 * @param {string} sessionId
 * @returns {import("pusher-js").Channel}
 */
export const joinSessionRoom = (sessionId) => {
  if (!sessionId) return null;
  const pusher = getPusher();
  return pusher.subscribe(`private-session-${sessionId}`);
};

/**
 * Unsubscribe from a session channel.
 *
 * @param {string} sessionId
 */
export const leaveSessionRoom = (sessionId) => {
  if (!sessionId) return;
  const pusher = getPusher();
  pusher.unsubscribe(`private-session-${sessionId}`);
};

/**
 * Get an already-subscribed session channel.
 *
 * @param {string} sessionId
 * @returns {import("pusher-js").Channel | undefined}
 */
export const getSessionChannel = (sessionId) => {
  if (!sessionId || !pusherInstance) return undefined;
  return pusherInstance.channel(`private-session-${sessionId}`);
};
