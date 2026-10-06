import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filters';
import { AppLoggerService } from '../logging/logger.service';
import { DepartmentAccessDeniedException } from '../access/access.exceptions';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  const mockLogger = {
    setContext: jest.fn(),
    error: jest.fn(),
  } as unknown as AppLoggerService;

  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'POST', url: '/api/v1/visits', body: {} }),
    }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send the business code of an ApiException with its HTTP status', () => {
    // ACT
    filter.catch(new DepartmentAccessDeniedException(2), host);

    // ASSERT: status HTTP 403, código de negocio 130
    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 130,
        message: 'No perteneces al área con ID 2',
      }),
    );
  });

  it('should use the HTTP status as code for standard Nest exceptions', () => {
    filter.catch(new NotFoundException('Cliente con ID 7 no encontrado'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 404,
        message: 'Cliente con ID 7 no encontrado',
      }),
    );
  });

  it('should keep validation errors as a list with code 400', () => {
    filter.catch(
      new BadRequestException([
        'userId must be a number conforming to the specified constraints',
      ]),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      code: 400,
      message: 'Validation failed',
      errors: [
        'userId must be a number conforming to the specified constraints',
      ],
    });
  });

  it('should answer 500 for unexpected errors', () => {
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 500, message: 'Internal server error' }),
    );
  });
});
