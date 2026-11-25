import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

/**
 * Punto único de acceso a Amazon Cognito.
 *
 * - `client`: cliente del SDK v3. Las credenciales salen de la cadena por defecto
 *   del SDK (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY o el rol del servidor) y solo
 *   se usan en las operaciones Admin*; las de login (InitiateAuth, etc.) son públicas
 *   y se protegen con el SECRET_HASH del app client.
 * - `accessTokenVerifier`: valida firma (JWKS del pool, en caché), expiración,
 *   emisor, client_id y token_use=access, sin llamar a Cognito en cada request.
 */
@Injectable()
export class CognitoService {
  readonly client: CognitoIdentityProviderClient;
  readonly clientId: string;
  readonly userPoolId: string;
  readonly accessTokenVerifier: ReturnType<typeof createAccessTokenVerifier>;

  private readonly clientSecret: string;

  constructor(config: ConfigService) {
    const region = config.getOrThrow<string>('cognito.region');
    this.userPoolId = config.getOrThrow<string>('cognito.userPoolId');
    this.clientId = config.getOrThrow<string>('cognito.clientId');
    this.clientSecret = config.getOrThrow<string>('cognito.clientSecret');

    this.client = new CognitoIdentityProviderClient({ region });
    this.accessTokenVerifier = createAccessTokenVerifier(
      this.userPoolId,
      this.clientId,
    );
  }

  /**
   * SECRET_HASH que exige un app client con secret:
   * Base64(HMAC_SHA256(clientSecret, username + clientId)).
   * `username` es el que Cognito conoce: el correo en el login, o el `sub`
   * (usuario interno de Cognito) en el refresh.
   */
  secretHash(username: string): string {
    return createHmac('sha256', this.clientSecret)
      .update(username + this.clientId)
      .digest('base64');
  }
}

function createAccessTokenVerifier(userPoolId: string, clientId: string) {
  return CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'access',
  });
}
