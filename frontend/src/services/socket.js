import Pusher from "pusher-js";
import { API_BASE_URL } from "./api";

let pusherInstance = null;

/**
 * Get or create the Pusher client instance.
 */
const getPusher = () => {
  if (!pusherInstance) {
    const token = localStorage.getItem("accessToken");

    // Initialize Pusher
    pusherInstance = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      authEndpoint: `${API_BASE_URL.replace(/\/$/, "")}/pusher/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    pusherInstance.connection.bind("error", (err) => {
      console.warn("Pusher connection error:", err);
    });
  }
  return pusherInstance;
};

/**
 * Connect to Pusher (initializes the instance if needed).
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
 * Returns an object with `bind` and `unbind` methods so existing React code works.
 *
 * @param {string} sessionId
 * @returns {{ bind: Function, unbind: Function }}
 */
export const joinSessionRoom = (sessionId) => {
  if (!sessionId) return null;
  const pusher = getPusher();
  
  if (!pusher) {
    return {
      bind: () => console.warn(`[Pusher Mock] bind skipped for missing pusher`),
      unbind: () => console.warn(`[Pusher Mock] unbind skipped for missing pusher`),
    };
  }

  const channelName = `private-session-${sessionId}`;
  const channel = pusher.subscribe(channelName);

  return {
    bind: (event, callback) => {
      channel.bind(event, callback);
    },
    unbind: (event, callback) => {
      if (callback) {
        channel.unbind(event, callback);
      } else {
        channel.unbind(event);
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
  const pusher = getPusher();
  if (!pusher) return;
  const channelName = `private-session-${sessionId}`;
  pusher.unsubscribe(channelName);
};

/**
 * Get an already-subscribed session channel wrapper.
 *
 * @param {string} sessionId
 * @returns {{ bind: Function, unbind: Function } | undefined}
 */
export const getSessionChannel = (sessionId) => {
  if (!sessionId) return undefined;
  const pusher = getPusher();
  if (!pusher) return undefined;
  
  const channelName = `private-session-${sessionId}`;
  const channel = pusher.channel(channelName);

  if (!channel) return undefined;

  return {
    bind: (event, callback) => {
      channel.bind(event, callback);
    },
    unbind: (event, callback) => {
      if (callback) {
        channel.unbind(event, callback);
      } else {
        channel.unbind(event);
      }
    },
  };
};
