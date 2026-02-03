import express from "express";
import cloudPrinterRoutes from "./routes/cloudPrinter.routes.js";

const app = express();
app.use(express.json());

app.use("/api/cloud", cloudPrinterRoutes);
app.use("/api/cloudprinter", cloudPrinterRoutes);

export default app;
