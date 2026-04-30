/**
 * PAX A35 POSLINK HTTP Integration
 *
 * Communicates directly with the PAX terminal's built-in HTTP server.
 * No external bridge needed — the PAX terminal handles all Elavon communication.
 *
 * Protocol: POSLINK over HTTP GET
 * URL:  http://{pax_terminal_ip}:{pax_terminal_port}/?{base64_packet}
 *
 * Packet format (STX/ETX framed, pipe-delimited fields, base64-encoded):
 *   STX | command | FS | version | FS | timestamp | FS | ...fields... | ETX | LRC
 *
 * POSLINK command codes:
 *   A00 = Initialize (status ping)
 *   A14 = Abort (cancel current transaction)
 *   T00 = Sale
 *   T02 = Void
 *   T04 = Return (refund)
 *
 * Response fields (index):
 *   0  = status ("OK" | "ERR")
 *   1  = command
 *   2  = version
 *   3  = response code ("000000" = approved)
 *   4  = response message
 *   5  = auth code
 *   6  = ref num
 *   7  = trace num
 *   8  = EDC type
 *   9  = card type
 *   10 = entry mode
 *   11 = amount (cents)
 *   12 = amount 2 (tips/cash back)
 *   13 = account number (masked)
 *   14 = cardholder name
 *   15 = timestamp
 *   16 = expiry
 *   17 = AID
 *   18 = TC
 */

import fetch from "node-fetch";
import { config } from "../../config.js";
import { getPaxElavonConnectionPayload } from "../../config/paxElavon.config.js";

/* ============================================================
   POSLINK CONSTANTS
============================================================ */
const STX = "\x02";
const ETX = "\x03";
const FS = "\x1c";

const CMD = {
  INIT: "A00",
  ABORT: "A14",
  SALE: "T00",
  SALE_ALT: "T01",
  VOID: "T02",
  RETURN: "T04"
};

const RESP_CODE_APPROVED = "000000";

/* ============================================================
   LOW-LEVEL PACKET BUILDER
============================================================ */

/**
 * Compute LRC (XOR of all bytes between STX and ETX, exclusive).
 */
function computeLRC(data) {
  let lrc = 0;
  for (let i = 0; i < data.length; i++) {
    lrc ^= data.charCodeAt(i);
  }
  return String.fromCharCode(lrc);
}

/**
 * Build a POSLINK request packet and base64-encode it.
 * @param {string} command  e.g. "T00"
 * @param {string[]} fields  payload fields
 */
function buildPacket(command, fields = []) {
  const version = "1.28";
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const body = [command, version, timestamp, ...fields].join(FS);
  const inner = `${body}${ETX}`;
  const lrc = computeLRC(inner);
  const packet = `${STX}${inner}${lrc}`;
  return Buffer.from(packet).toString("base64");
}

/* ============================================================
   LOW-LEVEL SEND / PARSE
============================================================ */

/**
 * Send a POSLINK command to the PAX terminal.
 * @param {string} base64Packet
 * @returns {Promise<string[]>} parsed response fields
 */
async function sendCommand(base64Packet) {
  if (!config.pax_terminal_ip) {
    throw new Error("pax_terminal_ip is not configured");
  }

  const url = `http://${config.pax_terminal_ip}:${config.pax_terminal_port || 10009}/?${base64Packet}`;

  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      timeout: config.pax_timeout_ms || 30000
    });
  } catch (err) {
    const e = new Error(`PAX terminal unreachable at ${config.pax_terminal_ip}: ${err.message}`);
    e.code = "PAX_UNREACHABLE";
    throw e;
  }

  const raw = await res.text();
  return parseResponse(raw);
}

/**
 * Decode and parse a base64 POSLINK response.
 * Strips STX/ETX/LRC framing, splits on FS.
 * @param {string} raw  base64-encoded response from terminal
 * @returns {string[]} fields array
 */
function parseResponse(raw) {
  const input = String(raw || "").trim();

  let candidate = input;
  try {
    // Some firmware returns URL-encoded payloads.
    candidate = decodeURIComponent(input);
  } catch {
    candidate = input;
  }

  const looksBase64 =
    candidate.length > 0 &&
    candidate.length % 4 === 0 &&
    /^[A-Za-z0-9+/=]+$/.test(candidate);

  let decoded = candidate;
  if (looksBase64) {
    try {
      decoded = Buffer.from(candidate, "base64").toString("utf8");
    } catch {
      decoded = candidate;
    }
  }

  // Strip STX (first char) and ETX+LRC (last 2 chars) if present
  if (decoded.charCodeAt(0) === 0x02) decoded = decoded.slice(1);
  if (decoded.charCodeAt(decoded.length - 2) === 0x03) decoded = decoded.slice(0, -2);
  else if (decoded.charCodeAt(decoded.length - 1) === 0x03) decoded = decoded.slice(0, -1);

  // If field separator isn't present, return raw in status for diagnostics.
  if (!decoded.includes(FS)) {
    return [decoded];
  }

  return decoded.split(FS);
}

/**
 * Map parsed fields to a structured result object.
 */
function mapResponse(fields) {
  return {
    status: fields[0] || "",
    command: fields[1] || "",
    version: fields[2] || "",
    responseCode: fields[3] || "",
    responseMessage: fields[4] || "",
    authCode: fields[5] || "",
    refNum: fields[6] || "",
    traceNum: fields[7] || "",
    cardType: fields[9] || "",
    entryMode: fields[10] || "",
    amount: fields[11] ? (parseInt(fields[11], 10) / 100).toFixed(2) : "0.00",
    maskedCard: fields[13] || "",
    cardholderName: fields[14] || "",
    timestamp: fields[15] || "",
    expiry: fields[16] || "",
    approved: (fields[3] || "") === RESP_CODE_APPROVED
  };
}

/* ============================================================
   PUBLIC API
============================================================ */

/**
 * Ensure PAX is enabled. Throws with a clean error code if not.
 */
function ensurePaxEnabled() {
  if (!config.pax_enabled) {
    const err = new Error("PAX payment terminal is not enabled");
    err.code = "PAX_NOT_ENABLED";
    throw err;
  }
  if (!config.pax_terminal_ip) {
    const err = new Error("pax_terminal_ip is not configured in config.json");
    err.code = "PAX_NOT_CONFIGURED";
    throw err;
  }
}

function getBridgeBaseUrl() {
  return String(config.pax_bridge_url || "").replace(/\/+$/, "");
}

async function callBridge(path, { method = "GET", body } = {}) {
  const base = getBridgeBaseUrl();
  if (!base) {
    const err = new Error("pax_bridge_url is not configured in config.json");
    err.code = "PAX_BRIDGE_NOT_CONFIGURED";
    throw err;
  }

  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined,
      timeout: config.pax_timeout_ms || 30000
    });
  } catch (err) {
    const e = new Error(`PAX bridge unreachable at ${base}: ${err.message}`);
    e.code = "PAX_BRIDGE_UNREACHABLE";
    throw e;
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { success: false, message: text || "Invalid JSON response from bridge" };
  }

  if (!res.ok || data?.success === false) {
    const e = new Error(data?.message || `PAX bridge request failed (${res.status})`);
    e.code = data?.code || "PAX_BRIDGE_ERROR";
    e.responseCode = data?.responseCode;
    e.paxResult = data?.paxResult;
    e.response = { status: res.status, data };
    throw e;
  }

  return data;
}

/**
 * GET /api/payment/status — ping terminal with A00 Initialize.
 */
export async function getPaxStatus() {
  if (!config.pax_enabled) {
    return {
      success: true,
      configured: false,
      enabled: false,
      message: "PAX A35 not enabled (set pax_enabled: true in config.json)",
      terminal_ip: config.pax_terminal_ip || null
    };
  }

  try {
    const elavon = getPaxElavonConnectionPayload();
    return await callBridge(
      `/payment/status?tid=${encodeURIComponent(elavon.tid)}&mid=${encodeURIComponent(elavon.mid)}`
    );
  } catch (err) {
    return {
      success: false,
      configured: true,
      enabled: true,
      online: false,
      terminal_ip: config.pax_terminal_ip,
      message: err.message,
      code: err.code || "PAX_ERROR"
    };
  }

  try {
    const packet = buildPacket(CMD.INIT, []);
    const fields = await sendCommand(packet);
    const result = mapResponse(fields);

    return {
      success: true,
      configured: true,
      enabled: true,
      online: true,
      terminal_ip: config.pax_terminal_ip,
      ...result,
      elavon: getPaxElavonConnectionPayload()
    };
  } catch (err) {
    return {
      success: false,
      configured: true,
      enabled: true,
      online: false,
      terminal_ip: config.pax_terminal_ip,
      message: err.message,
      code: err.code || "PAX_ERROR"
    };
  }
}

/**
 * POST /api/payment/initiate — T00 Sale.
 * @param {{ amount: number, currency?: string, order_id?: string }} params
 * amount in dollars (e.g. 12.99)
 */
export async function initiatePaxPayment({ amount, currency = "USD", order_id }) {
  ensurePaxEnabled();

  const elavon = getPaxElavonConnectionPayload();
  try {
    return await callBridge("/payment/initiate", {
      method: "POST",
      body: {
        amount,
        currency,
        orderId: order_id || null,
        terminalId: config.pax_terminal_id || null,
        elavon
      }
    });
  } catch (err) {
    const e = new Error(err.message || "PAX transaction declined");
    e.code = err.code || "PAX_DECLINED";
    e.responseCode = err.responseCode;
    e.paxResult = err.paxResult;
    throw e;
  }

  // POSLINK amount = cents as string, zero-padded, no decimals
  const amountCents = Math.round(amount * 100).toString();
  const _elavon = getPaxElavonConnectionPayload();

  // Legacy/older packet shape.
  const primaryFields = [
    "01",          // EDC type: Credit
    "01",          // transaction type: Sale
    amountCents,   // amount (cents)
    "0",           // amount 2 (cash back / tip)
    "",            // account number (terminal handles)
    "",            // expiry
    "",            // CVV
    "",            // zip
    order_id || "", // reference / order ID
    "",            // invoice number
    _elavon.tid,    // TID
    _elavon.mid,    // MID
    currency       // currency
  ];

  const primaryPacket = buildPacket(CMD.SALE, primaryFields);
  const primaryRaw = await sendCommand(primaryPacket);
  const primaryResult = mapResponse(primaryRaw);

  if (primaryResult.approved) {
    return primaryResult;
  }

  // Some PAX firmware expects T01 with explicit transType-first field order.
  if (
    primaryResult.responseCode === "100003" ||
    /TRANS TYPE NULL/i.test(primaryResult.responseMessage || "")
  ) {
    const altFields = [
      "01",          // trans type: Sale
      amountCents,   // amount (cents)
      "0",           // amount2 (tip/cashback)
      order_id || "", // ref/order
      "",            // invoice
      _elavon.tid,    // TID
      _elavon.mid,    // MID
      currency       // currency
    ];

    const altPacket = buildPacket(CMD.SALE_ALT, altFields);
    const altRaw = await sendCommand(altPacket);
    const altResult = mapResponse(altRaw);
    if (altResult.approved) {
      return altResult;
    }

    const err = new Error(altResult.responseMessage || "PAX transaction declined");
    err.code = "PAX_DECLINED";
    err.responseCode = altResult.responseCode;
    err.paxResult = altResult;
    err.initialPaxResult = primaryResult;
    throw err;
  }

  if (!primaryResult.approved) {
    const err = new Error(primaryResult.responseMessage || "PAX transaction declined");
    err.code = "PAX_DECLINED";
    err.responseCode = primaryResult.responseCode;
    err.paxResult = primaryResult;
    throw err;
  }

  return primaryResult;
}

/**
 * POST /api/payment/cancel — A14 Abort.
 */
export async function cancelPaxPayment() {
  ensurePaxEnabled();

  try {
    return await callBridge("/payment/cancel", {
      method: "POST",
      body: {
        terminalId: config.pax_terminal_id || null
      }
    });
  } catch (err) {
    const e = new Error(err.message || "PAX cancel failed");
    e.code = err.code || "PAX_CANCEL_FAILED";
    throw e;
  }

  const packet = buildPacket(CMD.ABORT, []);
  const raw = await sendCommand(packet);
  const result = mapResponse(raw);

  return { ...result, status: "cancelled" };
}

/**
 * POST /api/payment/void — T02 Void by reference number.
 * @param {{ ref_num: string, amount?: number }} params
 */
export async function voidPaxPayment({ ref_num, amount }) {
  ensurePaxEnabled();

  if (!ref_num) {
    const err = new Error("ref_num is required for void");
    err.code = "PAX_INVALID_INPUT";
    throw err;
  }

  try {
    return await callBridge("/payment/void", {
      method: "POST",
      body: {
        ref_num,
        amount,
        terminalId: config.pax_terminal_id || null,
        elavon: getPaxElavonConnectionPayload()
      }
    });
  } catch (err) {
    const e = new Error(err.message || "PAX void failed");
    e.code = err.code || "PAX_VOID_FAILED";
    e.responseCode = err.responseCode;
    throw e;
  }

  const amountCents = amount ? Math.round(amount * 100).toString() : "0";
  const elavon = getPaxElavonConnectionPayload();

  const fields = [
    "01",          // EDC type: Credit
    "04",          // transaction type: Void
    amountCents,
    "0",
    "",            // account number
    "",            // expiry
    "",
    "",
    ref_num,       // original ref num
    "",
    elavon.tid,
    elavon.mid
  ];

  const packet = buildPacket(CMD.VOID, fields);
  const raw = await sendCommand(packet);
  const result = mapResponse(raw);

  if (!result.approved) {
    const err = new Error(result.responseMessage || "PAX void failed");
    err.code = "PAX_VOID_FAILED";
    err.responseCode = result.responseCode;
    throw err;
  }

  return { ...result, status: "voided" };
}

/**
 * POST /api/payment/refund — T04 Return.
 * @param {{ amount: number, ref_num?: string }} params
 */
export async function refundPaxPayment({ amount, ref_num }) {
  ensurePaxEnabled();

  try {
    return await callBridge("/payment/refund", {
      method: "POST",
      body: {
        amount,
        ref_num,
        terminalId: config.pax_terminal_id || null,
        elavon: getPaxElavonConnectionPayload()
      }
    });
  } catch (err) {
    const e = new Error(err.message || "PAX refund failed");
    e.code = err.code || "PAX_REFUND_FAILED";
    e.responseCode = err.responseCode;
    throw e;
  }

  if (!amount || amount <= 0) {
    const err = new Error("amount > 0 required for refund");
    err.code = "PAX_INVALID_INPUT";
    throw err;
  }

  const amountCents = Math.round(amount * 100).toString();
  const elavon = getPaxElavonConnectionPayload();

  const fields = [
    "01",          // EDC type: Credit
    "03",          // transaction type: Return
    amountCents,
    "0",
    "",
    "",
    "",
    "",
    ref_num || "",
    "",
    elavon.tid,
    elavon.mid
  ];

  const packet = buildPacket(CMD.RETURN, fields);
  const raw = await sendCommand(packet);
  const result = mapResponse(raw);

  if (!result.approved) {
    const err = new Error(result.responseMessage || "PAX refund failed");
    err.code = "PAX_REFUND_FAILED";
    err.responseCode = result.responseCode;
    throw err;
  }

  return { ...result, status: "refunded" };
}
