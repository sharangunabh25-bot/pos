/**
 * Payment terminal (PAX A35 DBW) integration.
 *
 * This route proxies payment calls to a PAX bridge service
 * that wraps the official PAX SDK (typically .NET / Java).
 */
import { Router } from "express";
import {
  getPaxStatus,
  initiatePaxPayment,
  cancelPaxPayment,
  voidPaxPayment,
  refundPaxPayment
} from "../devices/payment/pax.service.js";
import {
  getPaxElavonConfig,
  getPaxElavonConnectionPayload
} from "../config/paxElavon.config.js";

const router = Router();

/**
 * GET /api/payment/elavon-config
 * Returns Elavon/PAX processor config (TID, MID, hosts, ports) for SDK or bridge setup.
 * No bridge or PAX_ENABLED required.
 */
router.get("/elavon-config", (_req, res) => {
  try {
    const full = getPaxElavonConfig();
    const connection = getPaxElavonConnectionPayload();
    res.json({
      success: true,
      connection,
      full
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get Elavon config"
    });
  }
});

/**
 * GET /api/payment/status
 * Payment terminal status (via PAX bridge)
 */
router.get("/status", async (_req, res) => {
  try {
    const status = await getPaxStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch PAX status"
    });
  }
});

/**
 * POST /api/payment/initiate
 * Initiate payment
 */
router.post("/initiate", async (req, res) => {
  const { amount, currency = "USD", order_id } = req.body || {};

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "amount (number > 0) is required"
    });
  }

  try {
    const result = await initiatePaxPayment({ amount, currency, order_id });
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({
      success: false,
      message: err.response?.data?.message || err.message || "PAX initiate failed",
      error: err.response?.data || undefined
    });
  }
});

/**
 * POST /api/payment/cancel
 * Cancel current transaction
 */
router.post("/cancel", async (_req, res) => {
  try {
    const result = await cancelPaxPayment();
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({
      success: false,
      message: err.response?.data?.message || err.message || "PAX cancel failed",
      error: err.response?.data || undefined
    });
  }
});

/**
 * POST /api/payment/void
 * Void a transaction by ref_num
 */
router.post("/void", async (req, res) => {
  const { ref_num, amount } = req.body || {};

  if (!ref_num) {
    return res.status(400).json({
      success: false,
      message: "ref_num is required"
    });
  }

  try {
    const result = await voidPaxPayment({ ref_num, amount });
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.code === "PAX_NOT_ENABLED" ? 503 : 502;
    res.status(status).json({
      success: false,
      message: err.message,
      code: err.code || "PAX_ERROR",
      responseCode: err.responseCode
    });
  }
});

/**
 * POST /api/payment/refund
 * Refund (return) a transaction
 */
router.post("/refund", async (req, res) => {
  const { amount, ref_num } = req.body || {};

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "amount (number > 0) is required"
    });
  }

  try {
    const result = await refundPaxPayment({ amount, ref_num });
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.code === "PAX_NOT_ENABLED" ? 503 : 502;
    res.status(status).json({
      success: false,
      message: err.message,
      code: err.code || "PAX_ERROR",
      responseCode: err.responseCode
    });
  }
});

export default router;
