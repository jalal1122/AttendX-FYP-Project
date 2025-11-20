/**
 * Custom API Error Class
 * Used for standardized error handling across all endpoints
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Bad Request (400)
   */
  static badRequest(message = "Bad Request", errors = []) {
    return new ApiError(400, message, errors);
  }

  /**
   * Unauthorized (401)
   */
  static unauthorized(message = "Unauthorized - Authentication required") {
    return new ApiError(401, message);
  }

  /**
   * Forbidden (403)
   */
  static forbidden(message = "Forbidden - Insufficient permissions") {
    return new ApiError(403, message);
  }

  /**
   * Not Found (404)
   */
  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  /**
   * Conflict (409)
   */
  static conflict(message = "Resource conflict") {
    return new ApiError(409, message);
  }

  /**
   * Unprocessable Entity (422)
   */
  static unprocessableEntity(message = "Validation failed", errors = []) {
    return new ApiError(422, message, errors);
  }

  /**
   * Internal Server Error (500)
   */
  static internal(message = "Internal Server Error") {
    return new ApiError(500, message);
  }

  /**
   * Service Unavailable (503)
   */
  static serviceUnavailable(message = "Service temporarily unavailable") {
    return new ApiError(503, message);
  }
}

export default ApiError;
