/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AppLoggerService } from '../logging/logger.service';
import { ApiErrorResponse } from '../interfaces/response.interface';
import { ApiException } from '../exceptions/api.exception';

interface NestHttpExceptionResponse {
  message: string | string[];
  error: string;
  statusCode: number;
}

/**
 * Global exception filter that catches all exceptions and formats them
 * according to the ApiErrorResponse interface
 */
@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HttpExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine HTTP status code
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error details
    const errorResponse = this.buildErrorResponse(exception, httpStatus);

    // Log the error with context
    this.logError(exception, request, httpStatus);

    // Send formatted response
    response.status(httpStatus).json(errorResponse);
  }

  /**
   * Builds the error response according to ApiErrorResponse interface
   */
  private buildErrorResponse(
    exception: unknown,
    httpStatus: number,
  ): ApiErrorResponse {
    // Handle ApiException (custom exceptions with business code and errors array)
    if (exception instanceof ApiException) {
      const exceptionResponse = exception.getResponse() as any;
      return {
        code: exceptionResponse.code || httpStatus,
        message: exceptionResponse.message || exception.message,
        errors: this.formatErrors(exceptionResponse.errors),
      };
    }

    // Handle standard NestJS HttpException
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // Handle validation errors from class-validator
      if (
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        const responseObj = exceptionResponse as NestHttpExceptionResponse;

        // ValidationPipe returns errors in 'message' field as array
        if (Array.isArray(responseObj.message)) {
          return {
            code: httpStatus,
            message: 'Validation failed',
            errors: responseObj.message,
          };
        }

        // Single message error
        return {
          code: httpStatus,
          message: responseObj.message || exception.message,
          errors: null,
        };
      }

      // String response
      return {
        code: httpStatus,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exception.message,
        errors: null,
      };
    }

    // Handle unexpected errors (non-HTTP exceptions)
    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.getInternalErrorMessage(exception),
      errors: null,
    };
  }

  /**
   * Formats the errors array to ensure all items are strings
   */
  private formatErrors(errors: any[] | undefined): string[] | null {
    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return null;
    }

    return errors.map((error) => {
      // If already a string, return as-is
      if (typeof error === 'string') {
        return error;
      }

      // If object with common error properties, format descriptively
      if (typeof error === 'object' && error !== null) {
        // Handle validation error format: { field, message }
        if (error.field && error.message) {
          return `${error.field}: ${error.message}`;
        }

        // Handle validation error format: { code, path, message }
        if (error.path && error.message) {
          const pathStr = Array.isArray(error.path)
            ? error.path.join('.')
            : error.path;
          return `${pathStr}: ${error.message}`;
        }

        // Handle property-based errors
        if (error.property && error.constraints) {
          const constraintMessages = Object.values(error.constraints);
          return constraintMessages.join(', ');
        }

        // Fallback: stringify the object
        return JSON.stringify(error);
      }

      // Fallback: convert to string
      return String(error);
    });
  }

  /**
   * Returns appropriate error message for internal errors
   * based on environment (development vs production)
   */
  private getInternalErrorMessage(exception: unknown): string {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment && exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  /**
   * Logs error details with context
   */
  private logError(exception: unknown, request: Request, status: number) {
    const message = `${request.method} ${request.url} - Status: ${status}`;

    if (exception instanceof Error) {
      this.logger.error(message, exception.stack);
    } else {
      this.logger.error(message, String(exception));
    }
  }
}
