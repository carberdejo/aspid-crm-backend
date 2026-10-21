import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Las entregas pasan a registrar el área en la que se hicieron, igual que visitas y
 * cotizaciones, para poder medirlas y aplicarles el alcance por área.
 *
 * La columna queda NULL-able: las entregas existentes se rellenan solo cuando su usuario
 * pertenece a UNA sola área (no hay ambigüedad). El resto queda en NULL para revisión manual:
 *
 *   SELECT d.id, d.user_id FROM aspid.deliveries d WHERE d.department_id IS NULL;
 */
export class AddDepartmentToDeliveries1791244800001 implements MigrationInterface {
  name = 'AddDepartmentToDeliveries1791244800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'aspid';

    await queryRunner.query(`
      ALTER TABLE ${s}.deliveries ADD COLUMN department_id bigint;

      ALTER TABLE ${s}.deliveries
        ADD CONSTRAINT fk_deliveries_department
        FOREIGN KEY (department_id) REFERENCES ${s}.department (id);

      CREATE INDEX idx_deliveries_department_id ON ${s}.deliveries (department_id);

      UPDATE ${s}.deliveries d
      SET department_id = single.department_id
      FROM (
        SELECT user_id, MIN(department_id) AS department_id
        FROM ${s}.user_departments
        GROUP BY user_id
        HAVING COUNT(DISTINCT department_id) = 1
      ) single
      WHERE d.user_id = single.user_id
        AND d.department_id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'aspid';

    await queryRunner.query(`
      DROP INDEX ${s}.idx_deliveries_department_id;
      ALTER TABLE ${s}.deliveries DROP CONSTRAINT fk_deliveries_department;
      ALTER TABLE ${s}.deliveries DROP COLUMN department_id;
    `);
  }
}
