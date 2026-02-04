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
  cancelPaxPayment
} from "../devices/payment/pax.service.js";

const router = Router();

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

export default router;
