import app from "./server.js";
import { cleanupStaleTerminals } from "./utils/hardwareRegistry.js";

const PORT = process.env.PORT || 3000;

let cleanupInterval = null;

/* ----------------------------------------------------
   START CLOUD SERVER
---------------------------------------------------- */
const server = app.listen(PORT, () => {
  console.log(`���� Cloud API running on port ${PORT}`);
});

/* ----------------------------------------------------
   TTL CLEANUP JOB (CLOUD ONLY)
---------------------------------------------------- */
cleanupInterval = setInterval(async () => {
  try {
    await cleanupStaleTerminals();
    console.log("���� Cleaned up stale terminals");
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  }
}, 60 * 1000);

/* ----------------------------------------------------
   GRACEFUL SHUTDOWN (RENDER SAFE)
---------------------------------------------------- */
function shutdown() {
  console.log("���� Shutting down cloud API...");
  if (cleanupInterval) clearInterval(cleanupInterval);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
