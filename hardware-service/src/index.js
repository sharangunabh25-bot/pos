import app from "./server.js";
import { cleanupStaleTerminals } from "./utils/hardwareRegistry.js";

const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () => {
  console.log(`☁️ Cloud API running on port ${PORT}`);
});

setInterval(cleanupStaleTerminals, 60_000);

process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
