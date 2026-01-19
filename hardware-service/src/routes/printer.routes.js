import express from "express";
import { listPrinters, printReceipt } from "../devices/printer/printer.windows.js";

const router = express.Router();

router.get("/list", async (req, res) => {
  try {
    const printers = await listPrinters();
    res.json({ success: true, printers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/print", async (req, res) => {
  try {
    const result = await printReceipt(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
