# PAX Terminal & Elavon SDK Integration

This document describes the PAX payment terminal and Elavon processor setup used for further development. Configuration is derived from the Elavon terminal letter (e.g. **Southwest Farmers Market**).

## Architecture

- **POS Agent (this repo)**: Node.js service that exposes payment APIs and forwards requests to a **PAX bridge**.
- **PAX bridge**: Separate service (typically .NET or Java) that uses the **official PAX SDK** to talk to the physical PAX device (e.g. A35).
- **Elavon**: Acquirer/processor. The terminal is configured with TID, MID, and connection endpoints (SSL/TCP) from Elavon.

## Configuration Used (from PDF)

| Item | Value |
|------|--------|
| **Merchant ID (MID)** | 8045535591 |
| **DBA** | SOUTHWEST FARMERS MARKET |
| **MCC** | 5411 (Grocery Stores, Supermarkets) |
| **Bank/Terminal ID** | 007542 |
| **Terminal ID (TID)** | 0008045535591949 |
| **SSL** | prodgate02.viaconex.com:443 |
| **TCP Primary** | nettrans1.novainfo.net:8100 |
| **TCP Secondary** | nettrans2.novainfo.net:8100 |
| **Acquirer** | Elavon (800-377-3962) |

All of the above are in `src/config/paxElavon.config.js` and can be overridden via environment variables (e.g. `PAX_ELAVON_TID`, `PAX_ELAVON_SSL_HOST`).

## SDK / Bridge Setup for Further Development

1. **Terminal config**: When implementing the PAX SDK (or a bridge that wraps it), use the connection payload from this service:
   - **`GET /api/payment/elavon-config`** – Returns `connection` (tid, mid, sslHost, sslPort, tcpPrimaryHost, etc.) and `full` config. Does not require PAX bridge or `PAX_ENABLED`. Use this to bootstrap the SDK or bridge.
   - `GET /api/payment/status` returns `elavon: { tid, mid, ... }` along with bridge status.
   - `POST /api/payment/initiate` and `POST /api/payment/cancel` send the same `elavon` object in the body so the bridge can configure the device.

2. **Env for this service** (hardware-service):
   - `PAX_ENABLED=true`
   - `PAX_BRIDGE_URL=http://localhost:7001` (or the URL of your bridge)
   - `PAX_TERMINAL_ID` (optional; local terminal identifier)
   - `PAX_ELAVON_*` to override any value from the PDF (see `paxElavon.config.js`).

3. **PAX SDK**: Obtain the official PAX SDK (Android/Java or .NET) from PAX Technology. Configure the device with the TID and connection settings above; the SDK will connect to Elavon using the SSL or TCP endpoints.

4. **Support**: Software vendor (VAR) 877-859-0099; Elavon technical support 800-377-3962 (option 2, option 2). Management portal: www.mypaymentsinsider.com.

## Files

- `src/config/paxElavon.config.js` – Elavon/PAX constants, `getPaxElavonConfig()`, `getPaxElavonConnectionPayload()`.
- `src/devices/payment/pax.service.js` – Calls the PAX bridge and passes the Elavon payload.
- `src/routes/payment.routes.js` – HTTP routes: `GET /elavon-config`, `GET /status`, `POST /initiate`, `POST /cancel`.
