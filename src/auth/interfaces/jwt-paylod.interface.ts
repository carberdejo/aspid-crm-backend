import { Role } from 'src/users/interfaces';

export interface JwtPayload {
  sub: number; // id del usuario
  codUser: string;
  email: string;
  role: Role;
  depts: number[]; // Lista de departamentos a los que el usuario tiene acceso
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  sub: number; // id del usuario
  sessionId: string;
}
