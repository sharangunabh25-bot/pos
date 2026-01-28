// src/server.js
import express from "express";

import printerRoutes from "./routes/printer.routes.js";
import scannerRoutes from "./routes/scanner.routes.js";
import scaleRoutes from "./routes/scale.routes.js";
import terminalRoutes from "./routes/terminal.routes.js";
import cloudPrinterRoutes from "./routes/cloudPrinter.routes.js";

import { verifyHardwareAgent } from "./middleware/verifyHardwareAgent.js";
import { config } from "./config.js";

const app = express();

app.use(express.json({ limit: "1mb" }));

/* ----------------------------------------------------
   Diagnostics
---------------------------------------------------- */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    approved: !!config.approved,
    store_id: config.store_id || null
  });
});

/* ----------------------------------------------------
   Terminal pairing
---------------------------------------------------- */
app.use("/api/terminal", terminalRoutes);

/* ----------------------------------------------------
   CLOUD ROUTES (frontend → cloud)
---------------------------------------------------- */
app.use("/api/cloud", cloudPrinterRoutes);

/* ----------------------------------------------------
   Lock gate
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
   HARDWARE ROUTES (cloud → hardware)
---------------------------------------------------- */
app.use("/api/printer", lockGate, verifyHardwareAgent, printerRoutes);
app.use("/api/scanner", lockGate, verifyHardwareAgent, scannerRoutes);
app.use("/api/scale", lockGate, verifyHardwareAgent, scaleRoutes);

/* ----------------------------------------------------
   404
---------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

export default app;
