import app from "./server.js";
import { cleanupStaleTerminals } from "./utils/hardwareRegistry.js";


const PORT = process.env.PORT || 3000;

let cleanupInterval = null;

/* ----------------------------------------------------
   START SERVER AFTER DB IS READY
---------------------------------------------------- */
async function startServer() {
  try {
    await db.authenticate?.(); // optional if using sequelize
    console.log("✅ Database connected");

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
       GRACEFUL SHUTDOWN (RENDER / DOCKER SAFE)
    ---------------------------------------------------- */
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    function shutdown() {
      console.log("���� Shutting down cloud API...");
      if (cleanupInterval) clearInterval(cleanupInterval);
      server.close(() => process.exit(0));
    }

  } catch (err) {
    console.error("❌ Failed to start cloud server:", err);
    process.exit(1);
  }
}

startServer();
