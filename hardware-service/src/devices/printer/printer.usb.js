import ThermalPrinter from 'node-thermal-printer';

const printer = new ThermalPrinter.printer({
  type: ThermalPrinter.types.EPSON,
  interface: 'usb'
});

export async function printReceipt(lines) {
  printer.alignCenter();
  printer.println('SHOP NAME');
  printer.drawLine();

  lines.forEach(line => printer.println(line));

  printer.drawLine();
  printer.cut();

  await printer.execute();
}
