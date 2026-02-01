import express from "express";
import printerRoutes from "./routes/printer.routes.js";
import scannerRoutes from "./routes/scanner.routes.js";
import scaleRoutes from "./routes/scale.routes.js";
import { verifyHardwareAgent } from "./middleware/verifyHardwareAgent.js";
import { heartbeat } from "./heartbeat.js";
import { config } from "./config.js";

const app = express();
app.use(express.json());

function lockGate(req, res, next) {
  if (!config.approved || !config.store_id) {
    return res.status(423).json({ success: false });
  }
  next();
}

app.use("/api/printer", lockGate, verifyHardwareAgent, printerRoutes);
app.use("/api/scanner", lockGate, verifyHardwareAgent, scannerRoutes);
app.use("/api/scale", lockGate, verifyHardwareAgent, scaleRoutes);

app.listen(3001, () => {
  console.log("���� Hardware agent running on port 3001");
  console.log("���� NGROK:", process.env.NGROK_URL);
});

setInterval(heartbeat, 10_000);
