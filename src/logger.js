import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf } = format;

const colorizer = format.colorize();

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.simple(),
    format.padLevels(),
    format.printf(({ level, message, timestamp }) =>
      colorizer.colorize(level, `[${timestamp}] ${level}: ${message}`)
    ),
    format.colorize({ all: true }),
  ),
  transports: [new transports.Console()],
});