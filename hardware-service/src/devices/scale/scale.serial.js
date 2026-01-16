import { SerialPort } from 'serialport';
import EventBus from '../../events/bus.js';

const port = new SerialPort({
  path: 'COM3',
  baudRate: 9600
});

let buffer = '';

port.on('data', data => {
  buffer += data.toString();

  if (buffer.includes('\n')) {
    const weight = parseWeight(buffer);
    buffer = '';
    if (weight) {
      EventBus.emit('weight', weight);
    }
  }
});

function parseWeight(raw) {
  // depends on scale protocol
  // example: "WT: 1.250 kg"
  const match = raw.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}
