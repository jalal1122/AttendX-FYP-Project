import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { authorizeChannel } from "../services/socket.js";

const router = express.Router();

router.post("/auth", protect, (req, res) => {
  const socketId = req.body.socket_id;
  const channelName = req.body.channel_name;

  try {
    const authResponse = authorizeChannel(socketId, channelName);
    res.send(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    res.status(403).send("Forbidden");
  }
});

export default router;
