/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export default asyncHandler;
