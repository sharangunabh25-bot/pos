import express from "express";
import printerRoutes from "./routes/printer.routes.js";
import scannerRoutes from "./routes/scanner.routes.js";
import scaleRoutes from "./routes/scale.routes.js";
import { verifyHardwareAgent } from "./middleware/verifyHardwareAgent.js";
import { heartbeat } from "./heartbeat.js";
import { config } from "./config.js";

const app = express();
app.use(express.json());

/* ----------------------------------------------------
   HEALTH (UNPROTECTED)
---------------------------------------------------- */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    approved: config.approved,
    store_id: config.store_id || null,
    terminal_uid: config.terminal_uid,
    ngrok_url: process.env.NGROK_URL || null
  });
});

/* ----------------------------------------------------
   LOCK GATE
---------------------------------------------------- */
function lockGate(req, res, next) {
  if (!config.approved || !config.store_id) {
    return res.status(423).json({
      success: false,
      message: "Terminal not approved"
    });
  }
  next();
}

/* ----------------------------------------------------
   HARDWARE ROUTES
---------------------------------------------------- */
app.use("/api/printer", lockGate, verifyHardwareAgent, printerRoutes);
app.use("/api/scanner", lockGate, verifyHardwareAgent, scannerRoutes);
app.use("/api/scale", lockGate, verifyHardwareAgent, scaleRoutes);

/* ----------------------------------------------------
   START SERVER
---------------------------------------------------- */
app.listen(3001, () => {
  console.log("����️ Hardware agent running on port 3001");
  console.log("���� NGROK:", process.env.NGROK_URL);
});

/* ----------------------------------------------------
   HEARTBEAT LOOP
---------------------------------------------------- */
setInterval(heartbeat, 10_000);
