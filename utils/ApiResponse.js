/**
 * Standardized API Response Class
 * Used for consistent JSON responses across all endpoints
 */
class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  /**
   * Send the response
   * @param {Object} res - Express response object
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }

  /**
   * Static helper for success responses
   */
  static success(res, data, message = "Success", statusCode = 200) {
    return new ApiResponse(statusCode, data, message).send(res);
  }

  /**
   * Static helper for created responses
   */
  static created(res, data, message = "Resource created successfully") {
    return new ApiResponse(201, data, message).send(res);
  }

  /**
   * Static helper for no content responses
   */
  static noContent(res, message = "No content") {
    return res.status(204).json({
      success: true,
      message,
    });
  }
}

export default ApiResponse;
