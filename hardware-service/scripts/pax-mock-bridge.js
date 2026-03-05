/**
 * scripts/pax-mock-bridge.js
 *
 * Mock PAX A35 bridge for local/Postman testing.
 * Simulates the bridge server that the hardware-service talks to.
 * Run: node scripts/pax-mock-bridge.js
 * Listens on: http://localhost:7001
 */

import express from "express";

const app = express();
app.use(express.json());

const PORT = 7001;

/* ------------------------------------------
   Simulated terminal state
------------------------------------------ */
let currentTransaction = null;
let txCounter = 1000;

/* ------------------------------------------
   GET /payment/status
------------------------------------------ */
app.get("/payment/status", (req, res) => {
    console.log("📟 [BRIDGE] GET /payment/status");
    res.json({
        success: true,
        status: currentTransaction ? "busy" : "idle",
        terminal: "PAX A35 (mock)",
        tid: req.query.tid || "0008045535591949",
        mid: req.query.mid || "8045535591",
        currentTransaction: currentTransaction || null
    });
});

/* ------------------------------------------
   POST /payment/initiate
------------------------------------------ */
app.post("/payment/initiate", (req, res) => {
    const { amount, currency = "USD", orderId, terminalId } = req.body;
    console.log("💳 [BRIDGE] POST /payment/initiate", { amount, currency, orderId });

    if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: "amount must be a positive number"
        });
    }

    if (currentTransaction) {
        return res.status(409).json({
            success: false,
            message: "Terminal busy — another transaction is in progress",
            currentTransaction
        });
    }
    txCounter++;
    currentTransaction = {
        transactionId: `MOCK-TX-${txCounter}`,
        status: "pending",
        amount,
        currency,
        orderId: orderId || null,
        terminalId: terminalId || null,
        startedAt: new Date().toISOString()
    };

    // Simulate a 2-second processing delay then auto-approve
    setTimeout(() => {
        if (currentTransaction && currentTransaction.transactionId === `MOCK-TX-${txCounter}`) {
            currentTransaction.status = "approved";
            currentTransaction.approvedAt = new Date().toISOString();
            currentTransaction.authCode = `AUTH${Math.floor(Math.random() * 900000) + 100000}`;
            console.log("✅ [BRIDGE] Transaction auto-approved:", currentTransaction.transactionId);
        }
    }, 2000);

    res.json({
        success: true,
        transactionId: currentTransaction.transactionId,
        status: "pending",
        amount,
        currency,
        message: "Transaction initiated — awaiting cardholder"
    });
});

/* ------------------------------------------
   POST /payment/cancel
------------------------------------------ */
app.post("/payment/cancel", (req, res) => {
    console.log("🚫 [BRIDGE] POST /payment/cancel");

    if (!currentTransaction) {
        return res.status(400).json({
            success: false,
            message: "No transaction in progress to cancel"
        });
    }

    const cancelled = { ...currentTransaction };
    cancelled.status = "cancelled";
    cancelled.cancelledAt = new Date().toISOString();
    currentTransaction = null;

    res.json({
        success: true,
        status: "cancelled",
        transactionId: cancelled.transactionId,
        cancelledAt: cancelled.cancelledAt
    });
});

/* ------------------------------------------
   GET /payment/result/:transactionId
------------------------------------------ */
app.get("/payment/result/:transactionId", (req, res) => {
    const { transactionId } = req.params;
    console.log("🔍 [BRIDGE] GET /payment/result", transactionId);

    if (!currentTransaction || currentTransaction.transactionId !== transactionId) {
        return res.status(404).json({
            success: false,
            message: "Transaction not found"
        });
    }

    res.json({
        success: true,
        ...currentTransaction
    });
});

/* ------------------------------------------
   POST /payment/void
------------------------------------------ */
app.post("/payment/void", (req, res) => {
    const { ref_num } = req.body || {};
    console.log("↩️  [BRIDGE] POST /payment/void", { ref_num });

    if (!ref_num) {
        return res.status(400).json({ success: false, message: "ref_num is required" });
    }

    const voided = { ...currentTransaction };
    currentTransaction = null;

    res.json({
        success: true,
        status: "voided",
        refNum: ref_num,
        transactionId: voided.transactionId || null,
        voidedAt: new Date().toISOString()
    });
});

/* ------------------------------------------
   POST /payment/refund
------------------------------------------ */
app.post("/payment/refund", (req, res) => {
    const { amount, ref_num } = req.body || {};
    console.log("💸 [BRIDGE] POST /payment/refund", { amount, ref_num });

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "amount > 0 required" });
    }

    res.json({
        success: true,
        status: "refunded",
        amount,
        refNum: ref_num || null,
        authCode: `REF${Math.floor(Math.random() * 900000) + 100000}`,
        refundedAt: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`\n🟢 PAX Mock Bridge running on http://localhost:${PORT}`);
    console.log("   Endpoints:");
    console.log(`   GET  /payment/status`);
    console.log(`   POST /payment/initiate   { amount: 12.99, currency: "USD", orderId: "ORD-001" }`);
    console.log(`   POST /payment/cancel`);
    console.log(`   POST /payment/void       { ref_num: "..." }`);
    console.log(`   POST /payment/refund     { amount: 5.00, ref_num: "..." }`);
    console.log(`   GET  /payment/result/:transactionId\n`);
});
