import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const PRINTER_NAME = "EPSON TM-T88V Receipt"; // must EXACTLY match wmic output

export async function listPrinters() {
  return new Promise((resolve, reject) => {
    exec("wmic printer get name", (err, stdout) => {
      if (err) return reject(err);

      const printers = stdout
        .split("\n")
        .slice(1)
        .map(p => p.trim())
        .filter(Boolean);

      resolve(printers);
    });
  });
}

export async function printReceipt(data) {
  return new Promise((resolve, reject) => {
    try {
      const lines = [];

      lines.push("        POS RECEIPT");
      lines.push("--------------------------------");

      for (const item of data.items || []) {
        const name = item.name.padEnd(16, " ");
        const qty = String(item.qty).padStart(3, " ");
        const price = String(item.price).padStart(8, " ");
        lines.push(`${name}${qty}${price}`);
      }

      lines.push("--------------------------------");
      lines.push(`TOTAL: ${data.total}`);
      lines.push("");
      lines.push("Thank you!");
      lines.push("\n\n\n"); // feed paper

      const receiptText = lines.join("\n");

      const tempFile = path.join(os.tmpdir(), `receipt_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, receiptText, "utf8");

      // ?? Direct spooler print (correct way)
      const command = `powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${PRINTER_NAME}'"`;

      exec(command, (err) => {
        fs.unlinkSync(tempFile);

        if (err) {
          reject(err.toString());
        } else {
          resolve({ success: true });
        }
      });

    } catch (e) {
      reject(e.toString());
    }
  });
}
