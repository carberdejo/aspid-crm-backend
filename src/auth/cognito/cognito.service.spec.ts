import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { CognitoService } from './cognito.service';

describe('CognitoService', () => {
  const values: Record<string, string> = {
    'cognito.region': 'us-east-1',
    'cognito.userPoolId': 'us-east-1_TestPool1',
    'cognito.clientId': 'test-client-id',
    'cognito.clientSecret': 'test-client-secret',
  };

  const buildService = (overrides: Record<string, string | undefined> = {}) => {
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const value = key in overrides ? overrides[key] : values[key];
        if (value === undefined) throw new Error(`Falta ${key}`);
        return value;
      }),
    } as unknown as ConfigService;
    return new CognitoService(config);
  };

  it('calcula el SECRET_HASH como Base64(HMAC_SHA256(secret, username + clientId))', () => {
    // Arrange
    const service = buildService();
    const expected = createHmac('sha256', 'test-client-secret')
      .update('ana@aspid.com' + 'test-client-id')
      .digest('base64');

    // Act
    const hash = service.secretHash('ana@aspid.com');

    // Assert
    expect(hash).toBe(expected);
  });

  it('genera hashes distintos para usuarios distintos', () => {
    // Arrange
    const service = buildService();

    // Act / Assert
    expect(service.secretHash('a@aspid.com')).not.toBe(
      service.secretHash('b@aspid.com'),
    );
  });

  it('expone el pool y el client configurados', () => {
    // Arrange / Act
    const service = buildService();

    // Assert
    expect(service.userPoolId).toBe('us-east-1_TestPool1');
    expect(service.clientId).toBe('test-client-id');
  });

  it('falla al iniciar si falta el secret del app client', () => {
    // Arrange / Act / Assert
    expect(() => buildService({ 'cognito.clientSecret': undefined })).toThrow(
      'Falta cognito.clientSecret',
    );
  });
});
