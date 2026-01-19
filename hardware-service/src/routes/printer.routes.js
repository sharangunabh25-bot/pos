import express from "express";
import { printReceipt } from "../devices/printer/printer.usb.js";

const router = express.Router();

router.post("/print", async (req, res) => {
  try {
    const { title, items, total } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items to print"
      });
    }

    await printReceipt({ title, items, total });

    res.json({
      success: true,
      message: "Printed successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Printer failed",
      error: error.message
    });
  }
});

export default router;
