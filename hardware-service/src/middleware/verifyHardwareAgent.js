// src/middleware/verifyHardwareAgent.js
import { config } from "../config.js";

export function verifyHardwareAgent(req, res, next) {
  // ngrok / proxies may normalize headers
  const terminalId =
    req.headers["x-terminal-id"] ||
    req.headers["x-terminalid"];

  const agentSecret =
    req.headers["x-agent-secret"] ||
    req.headers["x-agentsecret"];

  // ---- Debug (safe) ----
  console.log("���� [HARDWARE AUTH] Incoming headers:", {
    terminalId,
    agentSecret: agentSecret ? "PRESENT" : "MISSING"
  });

  // ---- Missing headers ----
  if (!terminalId || !agentSecret) {
    return res.status(401).json({
      success: false,
      message: "Missing authentication headers"
    });
  }

  // ---- Credential mismatch ----
  if (
    terminalId !== config.terminal_uid ||
    agentSecret !== config.agent_secret
  ) {
    console.error("❌ [HARDWARE AUTH] Invalid credentials", {
      expected_terminal: config.terminal_uid,
      received_terminal: terminalId
    });

    return res.status(401).json({
      success: false,
      message: "Invalid terminal credentials"
    });
  }

  // ---- Attach terminal context ----
  req.terminal = {
    terminal_uid: config.terminal_uid,
    store_id: config.store_id
  };

  next();
}
