// src/middleware/verifyHardwareAgent.js
import { config } from "../config.js";

export function verifyHardwareAgent(req, res, next) {
  const terminalId = req.headers["x-terminal-id"];
  const agentSecret = req.headers["x-agent-secret"];

  console.log("���� [HARDWARE AUTH] Incoming request", {
    terminalId,
    agentSecret: agentSecret ? "PRESENT" : "MISSING"
  });

  // Only check presence — cloud already verified identity
  if (!terminalId || !agentSecret) {
    console.error("❌ [HARDWARE AUTH] Missing headers");
    return res.status(401).json({
      success: false,
      message: "Missing authentication headers"
    });
  }

  // Attach context for routes
  req.terminal = {
    terminal_uid: terminalId
  };

  console.log("✅ [HARDWARE AUTH] Request accepted");
  next();
}
