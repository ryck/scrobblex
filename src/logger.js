import winston from 'winston';

const { createLogger, format, transports } = winston;

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.cli(),
  transports: [new transports.Console()],
});
