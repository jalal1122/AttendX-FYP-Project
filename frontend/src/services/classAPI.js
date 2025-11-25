import api from "./api";

// Class API endpoints
export const classAPI = {
  // Get all classes (teacher's created classes or student's joined classes)
  getAllClasses: async () => {
    const response = await api.get("/class");
    return response.data;
  },

  // Get class details
  getClassDetails: async (classId) => {
    const response = await api.get(`/class/${classId}`);
    return response.data;
  },

  // Create class (Teacher only)
  createClass: async (classData) => {
    const response = await api.post("/class/create", classData);
    return response.data;
  },

  // Join class (Student only)
  joinClass: async (code) => {
    const response = await api.post("/class/join", { code });
    return response.data;
  },

  // Unjoin class (Student only)
  unjoinClass: async (classId) => {
    const response = await api.post("/class/unjoin", { classId });
    return response.data;
  },

  // Remove student (Teacher/Admin only)
  removeStudent: async (classId, studentId) => {
    const response = await api.post("/class/remove-student", {
      classId,
      studentId,
    });
    return response.data;
  },

  // Update class details (Teacher/Admin only)
  updateClass: async (classId, classData) => {
    const response = await api.put(`/class/${classId}`, classData);
    return response.data;
  },

  // Delete class (Teacher/Admin only)
  deleteClass: async (classId) => {
    const response = await api.delete(`/class/${classId}`);
    return response.data;
  },
};

export default classAPI;
