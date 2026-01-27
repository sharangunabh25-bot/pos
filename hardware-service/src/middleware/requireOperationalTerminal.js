// src/middleware/requireOperationalTerminal.js
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "config.json");

export function requireOperationalTerminal(req, res, next) {
  if (!fs.existsSync(CONFIG_PATH)) {
    return res.status(401).json({
      success: false,
      message: "Terminal not initialized"
    });
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));

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

  if (!config.approved) {
    return res.status(403).json({
      success: false,
      message: "Terminal not approved by admin"
    });
  }

  if (!config.store_id) {
    return res.status(403).json({
      success: false,
      message: "Terminal not assigned to any store"
    });
  }

  req.terminal = {
    terminal_uid: config.terminal_uid,
    store_id: config.store_id
  };

  next();
}
