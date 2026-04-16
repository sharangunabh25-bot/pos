import app from "./server.js";
import { initDB } from "./db.js";
import { cleanupStaleTerminals } from "./utils/hardwareRegistry.js";

const PORT = process.env.PORT || 10000;

async function start() {
  await initDB();

  const server = app.listen(PORT, () => {
    console.log(`Cloud API running on port ${PORT}`);
  });

  setInterval(async () => {
    try {
      await cleanupStaleTerminals();
    } catch (err) {
      console.error("Failed to clean up stale terminals:", err.message);
    }
  }, 60_000);

  const shutdown = () => server.close();
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  console.error("Cloud API failed to start:", err.message);
  process.exit(1);
});
