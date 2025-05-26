import winston from 'winston';

const { combine, timestamp, printf, colorize, align, json } = winston.format;

// Formato para saída de log no console
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `[${timestamp}] ${level}: ${message}${metaString}`;
});

// Configuração do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production' 
      ? combine(json())
      : combine(colorize({ all: true }), align(), consoleFormat)
  ),
  defaultMeta: { service: 'scriptly-backend' },
  transports: [
    // - Escreve todos os logs com nível 'error' e abaixo para 'error.log'
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // - Escreve todos os logs com nível 'info' e abaixo para 'combined.log'
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false, // não encerra em exceções não tratadas
});

// Se não estivermos em produção, também registre no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Stream para o morgan (HTTP request logging)
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
