import { config } from "../config.js";

export function verifyAgent(req, res, next) {
  const secret = req.headers["x-agent-secret"];

  if (!secret || secret !== config.agent_secret) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized agent"
    });
  }

  next();
}
