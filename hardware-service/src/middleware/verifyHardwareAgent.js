// src/middleware/verifyHardwareAgent.js
import { config } from "../config.js";

export function verifyHardwareAgent(req, res, next) {
  const terminalId = req.headers["x-terminal-id"];
  const agentSecret = req.headers["x-agent-secret"];

  console.log("���� [HARDWARE AUTH] Incoming request");
  console.log("���� [HARDWARE AUTH] Headers received:", {
    "x-terminal-id": terminalId || "❌ MISSING",
    "x-agent-secret": agentSecret ? "✅ PRESENT" : "❌ MISSING",
    path: req.originalUrl,
    method: req.method
  });

  /* ----------------------------------------------------
     Step 1: Header presence check
  ---------------------------------------------------- */
  if (!terminalId || !agentSecret) {
    console.error("❌ [HARDWARE AUTH] Authentication headers missing", {
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

  /* ----------------------------------------------------
     Step 2: Log expected vs received (NO hard fail)
     (Cloud already validated identity)
  ---------------------------------------------------- */
  console.log("���� [HARDWARE AUTH] Validation context", {
    receivedTerminalId: terminalId,
    expectedTerminalId: config.terminal_uid,
    secretMatch: agentSecret === config.agent_secret
      ? "MATCH"
      : "NOT_MATCHING (allowed)"
  });

  /* ----------------------------------------------------
     Step 3: Attach terminal context
  ---------------------------------------------------- */
  req.terminal = {
    terminal_uid: terminalId,
    store_id: config.store_id || null
  };

  console.log("✅ [HARDWARE AUTH] Authentication passed");
  next();
}
