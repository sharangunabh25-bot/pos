import axios from "axios";
import { config } from "../../config.js";

/**
 * PAX A35 integration helper.
 *
 * This service talks to a local/remote bridge that actually uses
 * the vendor SDK (typically .NET / Java). Point `pax_bridge_url`
 * in `config.json` or `PAX_BRIDGE_URL` env var at that bridge.
 */

function ensureConfigured() {
  if (!config.pax_enabled) {
    const error = new Error("PAX payment terminal is not enabled");
    error.code = "PAX_NOT_ENABLED";
    throw error;
  }
  if (!config.pax_bridge_url) {
    const error = new Error("PAX bridge URL is not configured");
    error.code = "PAX_NOT_CONFIGURED";
    throw error;
  }
}

function getClient() {
  return axios.create({
    baseURL: config.pax_bridge_url,
    timeout: config.pax_timeout_ms || 30000
  });
}

export async function getPaxStatus() {
  if (!config.pax_enabled) {
    return {
      success: true,
      configured: false,
      message: "PAX A35 integration disabled",
      terminal_id: config.pax_terminal_id || null
    };
  }

  ensureConfigured();

  try {
    const client = getClient();
    const response = await client.get("/payment/status", {
      params: {
        terminalId: config.pax_terminal_id || undefined
      }
    });

    return {
      success: true,
      configured: true,
      terminal_id: config.pax_terminal_id || null,
      bridge: {
        url: config.pax_bridge_url
      },
      pax: response.data
    };
  } catch (err) {
    return {
      success: false,
      configured: true,
      terminal_id: config.pax_terminal_id || null,
      message: "Failed to query PAX bridge",
      error: err.response?.data || err.message
    };
  }
}

export async function initiatePaxPayment({ amount, currency, order_id }) {
  ensureConfigured();

  const client = getClient();

  const payload = {
    amount,
    currency,
    orderId: order_id,
    terminalId: config.pax_terminal_id || undefined
  };

  const response = await client.post("/payment/initiate", payload);
  return response.data;
}

export async function cancelPaxPayment() {
  ensureConfigured();

  const client = getClient();
  const response = await client.post("/payment/cancel", {
    terminalId: config.pax_terminal_id || undefined
  });

  return response.data;
}

