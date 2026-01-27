// src/routes/printer.routes.js
import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import { verifyAgent } from "../middleware/auth.js";
import { requireOperationalTerminal } from "../middleware/requireOperationalTerminal.js";

import { printReceipt, listPrinters } from "../devices/printer/printer.windows.js";
import { config } from "../config.js";

const router = express.Router();

// ==============================
// CONSTANTS
// ==============================
const AUDIT_LOG = path.resolve("./printer-jobs.log");

// ==============================
// MIDDLEWARE
// ==============================

// All printer routes require:
// 1) cryptographic auth (cloud → agent)
// 2) terminal approved + store assigned
router.use(verifyAgent);
router.use(requireOperationalTerminal);

// ==============================
// HELPERS
// ==============================

function logJob(entry) {
  const line = JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString()
  });

  fs.appendFileSync(AUDIT_LOG, line + "\n");
}

function validatePrintPayload(body) {
  if (!body) return "Missing request body";

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "items[] is required";
  }

  if (typeof body.total !== "number") {
    return "total must be a number";
  }

  for (const item of body.items) {
    if (
      typeof item.name !== "string" ||
      typeof item.qty !== "number" ||
      typeof item.price !== "number"
    ) {
      return "Each item must have name (string), qty (number), price (number)";
    }
  }

  return null;
}

// ==============================
// ROUTES
// ==============================

/**
 * ----------------------------------------------------
 * GET /api/printer/list
 * ----------------------------------------------------
 * Lists printers visible to THIS terminal only
 */
router.get("/list", async (req, res) => {
  try {
    const printers = await listPrinters();

    res.json({
      success: true,
      terminal_uid: config.terminal_uid,
      store_id: config.store_id,
      printers
    });
  } catch (err) {
    console.error("Printer list failed:", err?.message || err);

    res.status(500).json({
      success: false,
      message: "Failed to list printers",
      error: err.message
    });
  }
});

/**
 * ----------------------------------------------------
 * POST /api/printer/print
 * ----------------------------------------------------
 * Prints a receipt on THIS terminal only
 */
router.post("/print", async (req, res) => {
  const jobId = crypto.randomUUID();

  try {
    // 1) Validate payload
    const error = validatePrintPayload(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid print payload",
        error
      });
    }

    // 2) Enrich job metadata
    const job = {
      job_id: jobId,
      terminal_uid: config.terminal_uid,
      store_id: config.store_id,
      receipt: req.body
    };

    // 3) Log before printing (idempotency trace)
    logJob({
      ...job,
      status: "QUEUED"
    });

    // 4) Execute print
    await printReceipt(req.body);

    // 5) Log success
    logJob({
      job_id: jobId,
      terminal_uid: config.terminal_uid,
      store_id: config.store_id,
      status: "PRINTED"
    });

    res.json({
      success: true,
      job_id: jobId,
      terminal_uid: config.terminal_uid,
      store_id: config.store_id
    });
  } catch (err) {
    console.error("Printer failed:", err?.message || err);

    // Log failure
    logJob({
      job_id: jobId,
      terminal_uid: config.terminal_uid,
      store_id: config.store_id,
      status: "FAILED",
      error: err.message
    });

    res.status(500).json({
      success: false,
      message: "Printer failed",
      error: err.message,
      job_id: jobId
    });
  }
});

export default router;
