import axios from "axios";
import os from "os";
import fs from "fs";
import { config, CONFIG_PATH } from "./config.js";

export async function registerTerminal() {
  if (config.registered) {
    console.log("Terminal already registered:", config.terminal_id);
    return;
  }

  try {
    const res = await axios.post(
      `${config.cloud_url}/api/terminals/register`,
      {
        terminal_id: config.terminal_id,
        agent_secret: config.agent_secret,
        hostname: os.hostname(),
        platform: os.platform()
      }
    );

    const updated = {
      ...config,
      store_id: res.data.store_id || null,
      registered: true
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
    Object.assign(config, updated);

    console.log("Terminal registered successfully:", config.terminal_id);
  } catch (err) {
    console.error("Terminal registration failed:", err.message);
  }
}
