import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom exception class that extends HttpException to support additional error data
 * Compatible with ApiErrorResponse interface
 */
export class ApiException extends HttpException {
  /**
   * @param code - Business error code (e.g., 10 for NotFound, 15 for Duplicate, etc.)
   * @param message - Human-readable error message
   * @param errors - Additional error details (validation errors, context data, etc.)
   * @param httpStatus - HTTP status code (default: 400 Bad Request)
   */
  constructor(
    public readonly code: number,
    message: string,
    public readonly errors?: any[],
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code,
        message,
        errors: errors || undefined,
      },
      httpStatus,
    );
  }

  /**
   * Override getResponse to return structured error data
   */
  getResponse(): string | object {
    return {
      code: this.code,
      message: this.message,
      errors: this.errors,
    };
  }
}
