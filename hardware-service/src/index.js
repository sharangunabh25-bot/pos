import app from './server.js';

const PORT = 3001;

app.listen(PORT, () => {
  console.log('POS Hardware Service started');
  console.log(`HTTP server running on port ${PORT}`);
});
