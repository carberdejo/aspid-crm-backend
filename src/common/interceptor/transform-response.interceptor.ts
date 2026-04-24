import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';
import { ApiSuccessResponse } from '../interfaces/response.interface';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor<
  any,
  ApiSuccessResponse
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse> {
    return next.handle().pipe(
      map((response: unknown) => {
        // Serializar la respuesta para aplicar @Exclude() y otros decoradores
        const serialized = instanceToPlain(response);

        // Si la respuesta ya tiene la estructura ApiSuccessResponse, usarla
        if (
          serialized &&
          typeof serialized === 'object' &&
          'data' in serialized
        ) {
          const {
            code = 1,
            message = 'Results',
            data = null,
          } = serialized as ApiSuccessResponse;
          return { code, message, data };
        }

        // Si no, envolver automáticamente en data
        return { code: 1, message: 'Results', data: serialized };
      }),
    );
  }
}
