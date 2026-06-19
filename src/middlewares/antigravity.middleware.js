/**
 * Quantum Antigravity Middleware
 * Intercepts incoming requests to prevent Apache from crushing weightless JSON arrays ([])
 * into dense, stringified dark matter ("[]"). Levitates req.body properties and 
 * un-stringifies them safely back into arrays before they hit the database.
 */
export const antigravity = (req, res, next) => {
  // If the payload has sections and they have been crushed into a string
  if (req.body && typeof req.body.sections === 'string') {
    try {
      console.log("🚀 [Antigravity] Levitating crushed sections dark matter...");
      req.body.sections = JSON.parse(req.body.sections);
    } catch (err) {
      console.error("💥 [Antigravity] Failed to parse sections singularity:", err.message);
      // Fallback: if it's truly broken stringified matter, reset it to a clean weightless array
      req.body.sections = [];
    }
  }

  // You can also extend the antigravity field to other arrays if needed
  if (req.body && typeof req.body.students === 'string') {
    try {
      req.body.students = JSON.parse(req.body.students);
    } catch (err) {
      req.body.students = [];
    }
  }

  next();
};
