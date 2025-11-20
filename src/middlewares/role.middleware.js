import ApiError from "../../utils/ApiError.js";

/**
 * Check if user is Admin
 */
export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    throw ApiError.forbidden("Access denied. Admin role required");
  }
  next();
};

/**
 * Check if user is Teacher
 */
export const isTeacher = (req, res, next) => {
  if (req.user.role !== "teacher") {
    throw ApiError.forbidden("Access denied. Teacher role required");
  }
  next();
};

/**
 * Check if user is Student
 */
export const isStudent = (req, res, next) => {
  if (req.user.role !== "student") {
    throw ApiError.forbidden("Access denied. Student role required");
  }
  next();
};

/**
 * Check if user is Teacher or Admin
 */
export const isTeacherOrAdmin = (req, res, next) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") {
    throw ApiError.forbidden("Access denied. Teacher or Admin role required");
  }
  next();
};

/**
 * Check if user has any of the specified roles
 */
export const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. Required roles: ${roles.join(", ")}`
      );
    }
    next();
  };
};
