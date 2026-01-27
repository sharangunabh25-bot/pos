// src/middleware/verifyHardwareAgent.js
import { config } from "../config.js";

export function verifyHardwareAgent(req, res, next) {
  const terminalId = req.headers["x-terminal-id"];
  const agentSecret = req.headers["x-agent-secret"];

  if (!terminalId || !agentSecret) {
    return res.status(401).json({
      success: false,
      message: "Missing authentication headers"
    });
  }

  if (
    terminalId !== config.terminal_uid ||
    agentSecret !== config.agent_secret
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid terminal credentials"
    });
  }

  req.terminal = {
    terminal_uid: config.terminal_uid,
    store_id: config.store_id
  };

  next();
}
