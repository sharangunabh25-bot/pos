import express from "express";
import os from "os";
import { config } from "../config.js";

const router = express.Router();

router.get("/whoami", (req, res) => {
  res.json({
    terminal_id: config.terminal_id,
    store_id: config.store_id,
    hostname: os.hostname(),
    platform: os.platform()
  });
});

export default router;
