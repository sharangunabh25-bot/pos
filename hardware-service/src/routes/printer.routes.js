import express from 'express';
import { printReceipt } from '../devices/printer/printer.service.js';

const router = express.Router();

router.post('/print', async (req, res) => {
  try {
    await printReceipt(req.body);
    res.json({ success: true, message: 'Printed successfully' });
  } catch (err) {
    console.error('Printer error:', err);
    res.status(500).json({
      success: false,
      message: 'Printer failed',
      error: err.message,
    });
  }
});

export default router;
