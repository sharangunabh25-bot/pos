/**
 * Scanner service: stores last scan from Zebra DS2278 (or any HID/keyboard-mode scanner).
 * Devices emit "barcode" on EventBus; this service stores and exposes it.
 */
import EventBus from "../../events/bus.js";

let lastScan = null;
let lastScanAt = null;

/**
 * @returns {{ value: string, at: string } | null} Last barcode and timestamp
 */
export function getLastScan() {
  if (lastScan === null) return null;
  return { value: lastScan, at: lastScanAt || new Date().toISOString() };
}

/**
 * Set last scan (e.g. from EventBus or test).
 * @param {string} value - Barcode string
 */
export function setLastScan(value) {
  lastScan = value;
  lastScanAt = new Date().toISOString();
}

EventBus.on("barcode", (value) => {
  setLastScan(String(value));
});
