import api from "./api";

const attendanceAPI = {
  // Mark attendance using QR token
  markAttendance: async (
    token,
    latitude = null,
    longitude = null,
    deviceId = null
  ) => {
    const response = await api.post("/attendance/scan", {
      token,
      latitude,
      longitude,
      deviceId,
    });
    return response.data;
  },

  // Get student's attendance for a specific class
  getMyAttendance: async (classId) => {
    const response = await api.get(`/attendance/my-attendance/${classId}`);
    return response.data;
  },

  // Manual attendance update (teacher/admin only)
  manualUpdate: async (sessionId, studentId, status) => {
    const response = await api.patch("/attendance/update", {
      sessionId,
      studentId,
      status,
    });
    return response.data;
  },

  // Approve pending attendance (teacher/admin only)
  approveAttendance: async (sessionId, studentIds) => {
    const response = await api.post("/attendance/approve", {
      sessionId,
      studentIds,
    });
    return response.data;
  },
};

export default attendanceAPI;
