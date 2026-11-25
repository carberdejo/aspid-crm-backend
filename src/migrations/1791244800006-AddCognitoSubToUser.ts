import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Integración con Amazon Cognito: Cognito guarda la identidad (correo, contraseña,
 * MFA) y la base de ASPID sigue guardando rol, áreas y estado. `cognito_sub` es el
 * puente: el `sub` del access token de Cognito apunta a un único usuario local.
 *
 * Es nulo mientras el usuario no tenga cuenta en Cognito (convive con el login
 * actual hasta el corte). En Postgres, UNIQUE permite varios NULL.
 */
export class AddCognitoSubToUser1791244800006 implements MigrationInterface {
  name = 'AddCognitoSubToUser1791244800006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'aspid';

    await queryRunner.query(`
      ALTER TABLE ${s}."user"
        ADD COLUMN cognito_sub uuid NULL,
        ADD CONSTRAINT uk_user_cognito_sub UNIQUE (cognito_sub);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'aspid';

    await queryRunner.query(`
      ALTER TABLE ${s}."user"
        DROP CONSTRAINT uk_user_cognito_sub,
        DROP COLUMN cognito_sub;
    `);
  }
}
