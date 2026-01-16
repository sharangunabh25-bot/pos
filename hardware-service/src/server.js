import express from 'express';

// Route modules
import printerRoutes from './routes/printer.routes.js';
import scannerRoutes from './routes/scanner.routes.js';
import scaleRoutes from './routes/scale.routes.js';

const app = express();

/**
 * ----------------------------------------------------
 * Global Middleware
 * ----------------------------------------------------
 */
app.use(express.json({ limit: '1mb' }));

/**
 * ----------------------------------------------------
 * Health & System Routes
 * ----------------------------------------------------
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'POS Hardware Service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'POS Hardware Service is running',
  });
});

/**
 * ----------------------------------------------------
 * Hardware Routes
 * ----------------------------------------------------
 */

// Printer (thermal / receipt printer)
app.use('/api/printer', printerRoutes);

// Barcode / QR scanner
app.use('/api/scanner', scannerRoutes);

// Weighing scale
app.use('/api/scale', scaleRoutes);

/**
 * ----------------------------------------------------
 * 404 Handler
 * ----------------------------------------------------
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
  });
});

/**
 * ----------------------------------------------------
 * Global Error Handler
 * ----------------------------------------------------
 */
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

export default app;
