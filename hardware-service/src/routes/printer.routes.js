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

/**
 * Coerces numeric strings to numbers for total and item qty/price.
 * @param {Object} body - Raw request body
 * @returns {Object} Normalized body with numbers where applicable
 */
function normalizePrintPayload(body) {
  if (!body) return body;

  const total =
    typeof body.total === "string" && body.total.trim() !== ""
      ? Number(body.total)
      : body.total;

  const items = Array.isArray(body.items)
    ? body.items.map((item) => ({
        ...item,
        qty:
          typeof item.qty === "string" && item.qty.trim() !== ""
            ? Number(item.qty)
            : item.qty,
        price:
          typeof item.price === "string" && item.price.trim() !== ""
            ? Number(item.price)
            : item.price
      }))
    : body.items;

  return { ...body, total, items };
}

/**
 * Validates print payload; expects normalized body (total, qty, price as numbers).
 * @param {Object} body - Normalized request body
 * @returns {string|null} Error message or null if valid
 */
function validatePrintPayload(body) {
  if (!body) return "Missing request body";

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "items[] is required";
  }

  if (typeof body.total !== "number" || Number.isNaN(body.total)) {
    return "total must be a number";
  }

  for (const item of body.items) {
    if (
      typeof item.name !== "string" ||
      typeof item.qty !== "number" ||
      Number.isNaN(item.qty) ||
      typeof item.price !== "number" ||
      Number.isNaN(item.price)
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
    // 1) Normalize (coerce string numbers) then validate
    const payload = normalizePrintPayload(req.body);
    const error = validatePrintPayload(payload);
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
      receipt: payload
    };

    // 3) Log before printing (idempotency trace)
    logJob({
      ...job,
      status: "QUEUED"
    });

    // 4) Execute print
    await printReceipt(payload);

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
