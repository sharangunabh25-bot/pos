/**
 * Payment terminal (PAX A35 DBW) integration stub.
 * Production: integrate PAX SPM/SDK for initiate, status, capture.
 */
import { Router } from "express";

const router = Router();

/**
 * GET /api/payment/status
 * Payment terminal status (stub)
 */
router.get("/status", (_, res) => {
  res.json({
    success: true,
    configured: false,
    message: "PAX A35 integration: add PAX SDK (SPM) for production",
    endpoints: {
      initiate: "POST /api/payment/initiate",
      status: "GET /api/payment/status",
      cancel: "POST /api/payment/cancel"
    }
  });
});

/**
 * POST /api/payment/initiate
 * Initiate payment (stub - integrate PAX SDK)
 */
router.post("/initiate", (req, res) => {
  res.status(501).json({
    success: false,
    message: "PAX A35 not integrated",
    hint: "Integrate PAX SPM/SDK and implement initiate flow"
  });
});

/**
 * POST /api/payment/cancel
 * Cancel current transaction (stub)
 */
router.post("/cancel", (_, res) => {
  res.status(501).json({
    success: false,
    message: "PAX A35 not integrated"
  });
});

export default router;
