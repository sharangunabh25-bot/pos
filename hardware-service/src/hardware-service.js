import express from "express";
import printerRoutes from "./routes/printer.routes.js";
import scannerRoutes from "./routes/scanner.routes.js";
import scaleRoutes from "./routes/scale.routes.js";
import cashDrawerRoutes from "./routes/cashDrawer.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import keyboardRoutes from "./routes/keyboard.routes.js";
import displayRoutes from "./routes/display.routes.js";
import { verifyHardwareAgent } from "./middleware/verifyHardwareAgent.js";
import { heartbeat } from "./heartbeat.js";
import { config } from "./config.js";
import { initScale } from "./devices/scale/scale.service.js";

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
app.use("/api/cash-drawer", lockGate, verifyHardwareAgent, cashDrawerRoutes);
app.use("/api/payment", lockGate, verifyHardwareAgent, paymentRoutes);
app.use("/api/keyboard", lockGate, verifyHardwareAgent, keyboardRoutes);
app.use("/api/display", lockGate, verifyHardwareAgent, displayRoutes);

/* ----------------------------------------------------
   DEVICE INIT (scale: Datalogic / Remote Weight)
---------------------------------------------------- */
initScale({
  path: config.scale_serial_path,
  baudRate: config.scale_baud_rate
}).catch(() => {});

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
