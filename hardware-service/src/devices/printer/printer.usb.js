import ThermalPrinter from 'node-thermal-printer';
import logger from '../../utils/logger.js';

const printer = new ThermalPrinter.printer({
  type: ThermalPrinter.types.EPSON,
  interface: 'usb'
});

export async function printReceipt(lines = []) {
  try {
    printer.alignCenter();
    printer.println('POS RECEIPT');
    printer.drawLine();

    lines.forEach(l => printer.println(l));

    printer.drawLine();
    printer.cut();
    await printer.execute();

    logger.info('Receipt printed');
  } catch (err) {
    logger.error(`Printer error: ${err.message}`);
  }
}
