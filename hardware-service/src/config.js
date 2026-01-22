import fs from "fs";
import path from "path";
import crypto from "crypto";

const CONFIG_PATH = path.resolve("config.json");

function generateId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

let config;

if (!fs.existsSync(CONFIG_PATH)) {
  config = {
    terminal_id: generateId("TERM"),
    store_id: null,
    agent_secret: crypto.randomBytes(24).toString("hex"),
    cloud_url: "https://pos-agent-33ky.onrender.com"
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log("Generated new terminal identity:", config.terminal_id);
} else {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

export { config, CONFIG_PATH };
