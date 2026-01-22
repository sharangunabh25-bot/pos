import fs from "fs";
import path from "path";
import crypto from "crypto";

const IDENTITY_PATH = path.resolve("./data/identity.json");

export function loadIdentity() {
  if (fs.existsSync(IDENTITY_PATH)) {
    return JSON.parse(fs.readFileSync(IDENTITY_PATH, "utf8"));
  }

  const identity = {
    terminal_uid: crypto.randomUUID(),
    agent_secret: crypto.randomBytes(32).toString("hex")
  };

  fs.mkdirSync(path.dirname(IDENTITY_PATH), { recursive: true });
  fs.writeFileSync(IDENTITY_PATH, JSON.stringify(identity, null, 2));

  console.log("���� New terminal identity created:", identity.terminal_uid);

  return identity;
}
