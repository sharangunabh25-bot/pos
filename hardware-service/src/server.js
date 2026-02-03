import express from "express";
import cloudPrinterRoutes from "./routes/cloudPrinter.routes.js";
import cloudScannerRoutes from "./routes/cloudScanner.routes.js";
import cloudScaleRoutes from "./routes/cloudScale.routes.js";
import cloudCashDrawerRoutes from "./routes/cloudCashDrawer.routes.js";

const app = express();
app.use(express.json());

app.use("/api/cloud", cloudPrinterRoutes);
app.use("/api/cloudprinter", cloudPrinterRoutes);
app.use("/api/scanner", cloudScannerRoutes);
app.use("/api/scale", cloudScaleRoutes);
app.use("/api/cash-drawer", cloudCashDrawerRoutes);

export default app;
