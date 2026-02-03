// src/middleware/verifyHardwareAgent.js
import { config } from "../config.js";
import logger from "../utils/logger.js";

export function verifyHardwareAgent(req, res, next) {
  const terminalId = req.headers["x-terminal-id"];
  const agentSecret = req.headers["x-agent-secret"];

  logger.info("[HARDWARE AUTH] Incoming request", {
    path: req.originalUrl,
    method: req.method,
    has_x_terminal_id: !!terminalId,
    has_x_agent_secret: !!agentSecret
  });

  if (!terminalId || !agentSecret) {
    logger.error("[HARDWARE AUTH] Missing headers", {
      terminalIdPresent: !!terminalId,
      agentSecretPresent: !!agentSecret
    });
    return res.status(401).json({
      success: false,
      message: "Missing authentication headers",
      debug: {
        terminalIdPresent: !!terminalId,
        agentSecretPresent: !!agentSecret
      }
    });
  }

  logger.info("[HARDWARE AUTH] Validation", {
    receivedTerminalId: terminalId,
    expectedTerminalId: config.terminal_uid,
    secretMatch: agentSecret === config.agent_secret ? "MATCH" : "MISMATCH"
  });

  req.terminal = {
    terminal_uid: terminalId,
    store_id: config.store_id || null
  };
  logger.info("[HARDWARE AUTH] Passed");
  next();
}
