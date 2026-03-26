import pino from "pino";
import { RotatingFileStream } from "./log-rotation.js";

const LOG_DIR = `${import.meta.dir}/../../logs`;

const fileStream = new RotatingFileStream({
  dir: LOG_DIR,
  rotationIntervalMs: 5 * 60_000,
  retentionMs: 24 * 60 * 60_000,
});

export const logger = pino(
  { level: "info", timestamp: pino.stdTimeFunctions.isoTime },
  pino.multistream([{ stream: process.stdout }, { stream: fileStream }]),
);

export type Logger = pino.Logger;
