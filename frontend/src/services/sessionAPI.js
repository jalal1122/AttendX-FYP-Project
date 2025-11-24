import api from "./api";

const sessionAPI = {
  // Start a new attendance session
  startSession: async (classId, options = {}) => {
    const response = await api.post("/session/start", {
      classId,
      ...options,
    });
    return response.data;
  },

  // Get a fresh QR token (20s validity)
  getQRToken: async (sessionId) => {
    const response = await api.get(`/session/${sessionId}/qr-token`);
    return response.data;
  },

  // Get live attendance count for a session
  getSessionAttendance: async (sessionId) => {
    const response = await api.get(`/attendance/session/${sessionId}`);
    return response.data;
  },

  // End the session
  endSession: async (sessionId) => {
    const response = await api.post(`/session/${sessionId}/end`);
    return response.data;
  },

  // Get all sessions for a class
  getClassSessions: async (classId) => {
    const response = await api.get(`/session/class/${classId}`);
    return response.data;
  },

  // Get active session for a class
  getActiveSession: async (classId) => {
    const response = await api.get(`/session/class/${classId}/active`);
    return response.data;
  },

  // Create retroactive session for manual attendance entry
  createRetroactiveSession: async (sessionData) => {
    const response = await api.post("/session/create-retroactive", sessionData);
    return response.data;
  },

  // Get session details
  getSessionDetails: async (sessionId) => {
    const response = await api.get(`/session/${sessionId}`);
    return response.data;
  },
};

export default sessionAPI;
