import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const PRINTER_NAME = "EPSON TM-T88V Receipt"; // EXACT name from wmic

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
  try {
    const lines = [];
    lines.push("       POS RECEIPT");
    lines.push("");
    lines.push("----------------------------");

    for (const item of data.items || []) {
      lines.push(
        `${item.name.padEnd(12)} x${item.qty}  ${item.price}`
      );
    }

    lines.push("----------------------------");
    lines.push(`TOTAL: ${data.total}`);
    lines.push("");
    lines.push("Thank you!");
    lines.push("\n\n\n");

    const receiptText = lines.join("\n");

    const tempFile = path.join(os.tmpdir(), `receipt_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, receiptText, "utf8");

    const command = `
      powershell -Command "
      $p = Get-Printer -Name '${PRINTER_NAME}';
      if (!$p) { throw 'Printer not found'; }
      Start-Process -FilePath notepad.exe -ArgumentList '/p','${tempFile}' -NoNewWindow -Wait
      "
    `;

    return new Promise((resolve, reject) => {
      exec(command, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true });
        }
      });
    });

  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}
