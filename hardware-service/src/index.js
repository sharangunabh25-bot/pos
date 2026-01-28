import app from "./server.js";
import { cleanupStaleTerminals } from "./utils/hardwareRegistry.js";

const PORT = process.env.PORT || 3000;

/* ----------------------------------------------------
   START HTTP SERVER
---------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`☁️ Cloud API running on port ${PORT}`);
});

/* ----------------------------------------------------
   TTL CLEANUP JOB (CLOUD ONLY)
---------------------------------------------------- */
setInterval(async () => {
  try {
    await cleanupStaleTerminals();
    console.log("���� Cleaned up stale terminals");
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  }
}, 60 * 1000); // every 1 minute
