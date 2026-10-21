import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Un usuario no puede tener la misma área asignada dos veces.
 *
 * Antes de crear la restricción se eliminan los duplicados exactos (mismo usuario y
 * misma área), conservando la asignación más antigua. No se pierde información:
 * las filas duplicadas representan la misma asignación.
 */
export class UniqueUserDepartments1791244800002 implements MigrationInterface {
  name = 'UniqueUserDepartments1791244800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'aspid';

    await queryRunner.query(`
      DELETE FROM ${s}.user_departments newer
      USING ${s}.user_departments older
      WHERE newer.user_id = older.user_id
        AND newer.department_id = older.department_id
        AND newer.id > older.id;

      ALTER TABLE ${s}.user_departments
        ADD CONSTRAINT user_departments_user_dept_unique UNIQUE (user_id, department_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'aspid';

    await queryRunner.query(`
      ALTER TABLE ${s}.user_departments
        DROP CONSTRAINT user_departments_user_dept_unique;
    `);
  }
}
