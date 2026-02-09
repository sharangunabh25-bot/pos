/**
 * Promotes integration credentials from request body or query into headers
 * so clients that cannot set custom headers (e.g. PAX Android, some Laravel HTTP clients)
 * can send store_id / terminal_id / agent_secret in JSON body or query and still use cloud APIs.
 *
 * Accepted keys: store_id or x_store_id, terminal_id or x_terminal_id, agent_secret or x_agent_secret.
 * Headers take precedence; body/query are only used when the corresponding header is missing.
 */
export function integrationHeaders(req, res, next) {
  const fromBody = (key, alt) =>
    req.body?.[key] ?? req.body?.[alt] ?? req.query?.[key] ?? req.query?.[alt];

  if (!req.headers["x-store-id"]) {
    const v = fromBody("store_id", "x_store_id");
    if (v) req.headers["x-store-id"] = String(v).trim();
  }
  if (!req.headers["x-terminal-id"]) {
    const v = fromBody("terminal_id", "x_terminal_id");
    if (v) req.headers["x-terminal-id"] = String(v).trim();
  }
  if (!req.headers["x-agent-secret"]) {
    const v = fromBody("agent_secret", "x_agent_secret");
    if (v) req.headers["x-agent-secret"] = String(v).trim();
  }

  next();
}
