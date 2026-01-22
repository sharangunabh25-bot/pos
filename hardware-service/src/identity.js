import fs from "fs";
import path from "path";

const IDENTITY_PATH = path.resolve("./data/identity.json");

export function loadIdentity() {
  if (!fs.existsSync(IDENTITY_PATH)) {
    throw new Error(
      "❌ identity.json not found. Refusing to generate a new terminal identity.\n" +
      "This terminal must be provisioned and approved in the cloud first."
    );
  }

  const raw = fs.readFileSync(IDENTITY_PATH, "utf8");
  const identity = JSON.parse(raw);

  if (!identity.terminal_uid || !identity.agent_secret) {
    throw new Error(
      "❌ identity.json is missing terminal_uid or agent_secret.\n" +
      "Refusing to generate a new identity. Fix or reprovision this terminal."
    );
  }

  console.log("✅ Loaded terminal identity:", identity.terminal_uid);
  return identity;
}
