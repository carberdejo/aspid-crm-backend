import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const GetRefreshToken = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const cookies = request.cookies as Record<string, unknown> | undefined;

    // Si no se configuró cookie-parser, esto será undefined
    if (!cookies) return null;

    // Si pasamos un nombre específico lo busca, si no, busca 'refreshToken' por defecto
    const cookieName = data || 'refreshToken';
    const refreshToken = cookies[cookieName];
    console.log({ refreshToken });
    return refreshToken === 'string' ? refreshToken : null;
  },
);
