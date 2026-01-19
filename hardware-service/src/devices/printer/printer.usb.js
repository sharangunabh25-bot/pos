import ThermalPrinter from "node-thermal-printer";
import printerTypes from "node-thermal-printer/dist/printer-types.js";

export async function printReceipt(data) {
  try {
    const printer = new ThermalPrinter.printer({
      type: printerTypes.EPSON,
      interface: "printer:EPSON TM-T88V Receipt", // EXACT WINDOWS NAME
      options: {
        timeout: 5000
      }
    });

    const isConnected = await printer.isPrinterConnected();

    if (!isConnected) {
      throw new Error("Printer not connected");
    }

    // ---- PRINT FORMAT ----

    printer.alignCenter();
    printer.bold(true);
    printer.println(data.title || "POS BILL");
    printer.bold(false);
    printer.drawLine();

    printer.alignLeft();

    data.items.forEach(item => {
      printer.println(
        `${item.name}  x${item.qty}   ${item.price}`
      );
    });

    printer.drawLine();

    printer.alignRight();
    printer.println(`TOTAL: ${data.total}`);

    printer.newLine();
    printer.newLine();
    printer.cut();

    await printer.execute();

    return true;

  } catch (error) {
    console.error("Printer error:", error);
    throw error;
  }
}
