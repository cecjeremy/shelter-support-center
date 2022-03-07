import pino from 'pino';

const logger = pino({
  level: process.env.LOGGING_LEVEL?.toLowerCase() || 'debug',
  formatters: {
    level: (label: string) => {
      return { level: label };
    }
  },
  messageKey: 'message',
  base: {
    serviceName: process.env.SERVICE_NAME || 'undefined'
  },
  timestamp: true
});

export default logger;
