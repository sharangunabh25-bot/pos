import express from 'express';
import { WebSocketServer } from 'ws';
import EventBus from './events/bus.js';
import scannerRoutes from './routes/scanner.routes.js';
import scaleRoutes from './routes/scale.routes.js';
import printerRoutes from './routes/printer.routes.js';
import logger from './utils/logger.js';

const app = express();
app.use(express.json());

app.use('/scanner', scannerRoutes);
app.use('/scale', scaleRoutes);
app.use('/printer', printerRoutes);

const server = app.listen(3001, () => {
  logger.info('HTTP server running on port 3001');
});

const wss = new WebSocketServer({ server });

function broadcast(payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach(client => client.send(message));
}

EventBus.on('barcode', code => {
  broadcast({ type: 'barcode', value: code });
});

EventBus.on('weight', weight => {
  broadcast({ type: 'weight', value: weight });
});
