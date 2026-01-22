import express from "express";

// Route modules
import printerRoutes from "./routes/printer.routes.js";
import scannerRoutes from "./routes/scanner.routes.js";
import scaleRoutes from "./routes/scale.routes.js";
import terminalRoutes from "./routes/terminal.routes.js";

import { verifyAgent } from "./middleware/auth.js";
import { config } from "./config.js";

const app = express();

/**
 * ----------------------------------------------------
 * Global Middleware
 * ----------------------------------------------------
 */
app.use(express.json({ limit: "1mb" }));

/**
 * ----------------------------------------------------
 * Agent Diagnostics & Identity
 * (Always accessible – no auth, no lock)
 * ----------------------------------------------------
 */
app.get("/agent/status", (req, res) => {
  res.json({
    success: true,
    registered: !!config.registered,
    approved: !!config.approved,
    locked: !config.approved || !config.store_id,
    terminal_uid: config.terminal_uid || null,
    store_id: config.store_id || null,
    cloud_url: config.cloud_url || null,
    hostname: req.hostname,
    timestamp: new Date().toISOString()
  });
});

app.get("/agent/identity", (req, res) => {
  res.json({
    terminal_uid: config.terminal_uid || null,
    agent_secret: config.agent_secret || null,
    store_id: config.store_id || null,
    approved: !!config.approved
  });
});

/**
 * ----------------------------------------------------
 * Health & Root
 * ----------------------------------------------------
 */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "POS Hardware Service",
    locked: !config.approved || !config.store_id,
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "POS Hardware Service is running",
    locked: !config.approved || !config.store_id
  });
});

/**
 * ----------------------------------------------------
 * Terminal Registration / Pairing Routes
 * (Accessible even when locked)
 * ----------------------------------------------------
 */
app.use("/api/terminal", terminalRoutes);

/**
 * ----------------------------------------------------
 * ���� LOCK GATE (blocks all hardware routes)
 * ----------------------------------------------------
 */
app.use("/api", (req, res, next) => {
  if (!config.approved || !config.store_id) {
    return res.status(423).json({
      success: false,
      message: "Terminal is not approved or store is not assigned",
      terminal_uid: config.terminal_uid || null
    });
  }

  next();
});

/**
 * ----------------------------------------------------
 * ���� Agent Auth Middleware (after lock gate)
 * ----------------------------------------------------
 */
app.use("/api", verifyAgent);

/**
 * ----------------------------------------------------
 * Hardware Routes
 * ----------------------------------------------------
 */

// Printer (thermal / receipt printer)
app.use("/api/printer", printerRoutes);

// Barcode / QR scanner
app.use("/api/scanner", scannerRoutes);

// Weighing scale
app.use("/api/scale", scaleRoutes);

/**
 * ----------------------------------------------------
 * 404 Handler
 * ----------------------------------------------------
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.originalUrl
  });
});

/**
 * ----------------------------------------------------
 * Global Error Handler
 * ----------------------------------------------------
 */
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);

  res.status(500).json({
    error: "Internal Server Error",
    message: err.message
  });
});

export default app;
