import express from "express";
import cloudPrinterRoutes from "./routes/cloudPrinter.routes.js";
import cloudScannerRoutes from "./routes/cloudScanner.routes.js";
import cloudScaleRoutes from "./routes/cloudScale.routes.js";
import cloudCashDrawerRoutes from "./routes/cloudCashDrawer.routes.js";
import cloudPaymentRoutes from "./routes/cloudPayment.routes.js";
import terminalRoutes from "./routes/terminal.routes.js";
import integrationConfigRoutes from "./routes/integrationConfig.routes.js";
import { integrationHeaders } from "./middleware/integrationHeaders.js";

const app = express();
app.use(express.json());

// Allow store_id / terminal_id / agent_secret from body or query for clients that cannot set headers
app.use(integrationHeaders);

// Integration config: fetch header values for PAX/Laravel to use in subsequent calls
app.use("/api/integration-config", integrationConfigRoutes);

// Cloud-facing routes
app.use("/api/cloud", cloudPrinterRoutes);
app.use("/api/cloudprinter", cloudPrinterRoutes);
app.use("/api/scanner", cloudScannerRoutes);
app.use("/api/scale", cloudScaleRoutes);
app.use("/api/cash-drawer", cloudCashDrawerRoutes);
app.use("/api/payment", cloudPaymentRoutes);

// Terminal management routes
app.use("/api/terminal", terminalRoutes);

export default app;
