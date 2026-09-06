import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createStream } from "rotating-file-stream";

// Create logs directory if it doesn't exist
const logsDir = join(process.cwd(), "logs");
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Create rotating write stream for all logs
// Rotation: daily, keep 30 days of logs, compress old logs
const logStream = createStream("app.log", {
  interval: "1d", // Rotate daily
  maxFiles: 30, // Keep 30 days of logs
  compress: "gzip", // Compress old logs
  path: logsDir,
});

// Custom print function for Hono logger
// Writes to both console and rotating file
export function customLogger(message: string, ...rest: string[]) {
  if (process.env.NODE_ENV === "test") return;
  // Log to console (colorized output from Hono)
  console.log(message, ...rest);

  // Parse the Hono log message to extract structured data
  // Format: "<-- METHOD /path status TIME"
  const logEntry = {
    timestamp: new Date().toISOString(),
    message: message,
    extra: rest.length > 0 ? rest : undefined,
  };

  // Write to file as JSON (one line per request)
  logStream.write(`${JSON.stringify(logEntry)}\n`);
}
