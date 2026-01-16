import readline from 'readline';
import EventBus from '../../events/bus.js';

let buffer = '';

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
  if (key.name === 'return') {
    if (buffer.length > 0) {
      EventBus.emit('barcode', buffer);
      buffer = '';
    }
  } else {
    buffer += str;
  }
});
