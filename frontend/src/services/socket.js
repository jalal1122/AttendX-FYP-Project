import Pusher from "pusher-js";
import { API_BASE_URL } from "./api";

let pusherInstance = null;

/**
 * Get or create the Pusher client instance.
 * Returns null if Pusher environment variables are missing to avoid crash.
 */
const getPusher = () => {
  const key = import.meta.env.VITE_PUSHER_KEY;
  const cluster = import.meta.env.VITE_PUSHER_CLUSTER;

  if (!key) {
    console.error(
      "❌ Pusher client key (VITE_PUSHER_KEY) is missing. Real-time updates will not be active. " +
      "If this is in production, please configure VITE_PUSHER_KEY and VITE_PUSHER_CLUSTER in your deployment environment variables."
    );
    return null;
  }

  if (!pusherInstance) {
    const token = localStorage.getItem("accessToken");

    pusherInstance = new Pusher(key, {
      cluster: cluster,
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
 * Returns a Pusher Channel object or a mock fallback so page binding does not crash.
 *
 * @param {string} sessionId
 * @returns {import("pusher-js").Channel | { bind: Function, unbind: Function }}
 */
export const joinSessionRoom = (sessionId) => {
  if (!sessionId) return null;
  const pusher = getPusher();
  if (!pusher) {
    // Return mock channel object so binding doesn't throw errors
    return {
      bind: (event, callback) => {
        console.warn(`[Pusher Mock] bind skipped for "${event}" (Pusher key is missing)`);
      },
      unbind: (event, callback) => {
        console.warn(`[Pusher Mock] unbind skipped for "${event}"`);
      },
    };
  }
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
  if (!pusher) return;
  pusher.unsubscribe(`private-session-${sessionId}`);
};

/**
 * Get an already-subscribed session channel.
 *
 * @param {string} sessionId
 * @returns {import("pusher-js").Channel | undefined}
 */
export const getSessionChannel = (sessionId) => {
  if (!sessionId) return undefined;
  const pusher = getPusher();
  if (!pusher) return undefined;
  return pusher.channel(`private-session-${sessionId}`);
};

