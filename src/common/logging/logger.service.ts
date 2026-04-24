import { Injectable, LoggerService } from '@nestjs/common';

/**
 * Servicio de logging estructurado que implementa LoggerService de NestJS
 * Proporciona logs en formato JSON con contexto y timestamps
 *
 * Usa scope DEFAULT (singleton) para poder ser obtenido con .get() en main.ts
 * y reutilizado eficientemente en toda la aplicación
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    const logContext = context || this.context;
    const logEntry = {
      level: 'info',
      message,
      context: logContext,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${logContext}] ${message}`);
    }
  }

  error(message: string, trace?: string, context?: string) {
    const logContext = context || this.context;
    const logEntry = {
      level: 'error',
      message,
      trace,
      context: logContext,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.error(`[${logContext}] ${message}`);
      if (trace) {
        console.error(trace);
      }
    }
  }

  warn(message: string, context?: string) {
    const logContext = context || this.context;
    const logEntry = {
      level: 'warn',
      message,
      context: logContext,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.warn(`[${logContext}] ${message}`);
    }
  }

  debug(message: string, context?: string) {
    const logContext = context || this.context;

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${logContext}] ${message}`);
    }
  }

  verbose(message: string, context?: string) {
    const logContext = context || this.context;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[VERBOSE][${logContext}] ${message}`);
    }
  }
}
