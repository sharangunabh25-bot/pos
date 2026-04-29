import express from "express";
import printerRoutes from "./routes/printer.routes.js";
import scannerRoutes from "./routes/scanner.routes.js";
import scaleRoutes from "./routes/scale.routes.js";
import cashDrawerRoutes from "./routes/cashDrawer.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import keyboardRoutes from "./routes/keyboard.routes.js";
import displayRoutes from "./routes/display.routes.js";
import "./devices/scanner/scanner.hid.js";
import { initScanner } from "./devices/scanner/scanner.service.js";
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
}).catch(() => { });

initScanner({
  path: config.scanner_serial_path,
  baudRate: config.scanner_baud_rate
}).catch(() => { });

/* ----------------------------------------------------
   START SERVER
---------------------------------------------------- */
const server = app.listen(3001, () => {
  console.log("🖥️ Hardware agent running on port 3001");
  console.log("🌐 NGROK:", process.env.NGROK_URL);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      "❌ Port 3001 is already in use.\n" +
      "   Another instance of this service may be running.\n" +
      "   Run: Get-NetTCPConnection -LocalPort 3001 | Select OwningProcess\n" +
      "   Then: Stop-Process -Id <PID> -Force"
    );
  } else {
    console.error("❌ Server error:", err.message);
  }
  process.exit(1);
});

/* ----------------------------------------------------
   HEARTBEAT LOOP
---------------------------------------------------- */
setInterval(heartbeat, 10_000);
