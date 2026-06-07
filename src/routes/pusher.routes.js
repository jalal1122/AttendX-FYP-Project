import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import pusher from "../services/pusher.js";

const router = Router();

/**
 * POST /api/v1/pusher/auth
 *
 * Pusher's client SDK automatically POSTs here when subscribing to a
 * private channel (e.g. "private-session-<id>").  We verify the user's
 * JWT and then authorise the channel subscription.
 */
router.post("/auth", async (req, res) => {
  try {
    const { socket_id, channel_name } = req.body;

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded._id)
      .select("_id role name email")
      .lean();

    if (!user) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Authorize the channel subscription
    const authResponse = pusher.authorizeChannel(socket_id, channel_name);

    return res.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error.message);
    return res.status(403).json({ error: "Unauthorized" });
  }
});

export default router;
