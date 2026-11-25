import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Eliminado lógico de visitas y entregas: el registro no se borra, se marca con la
 * fecha (deleted_at) y el usuario (deleted_by) que lo eliminó. TypeORM excluye
 * automáticamente las filas con deleted_at en las consultas de la entidad.
 */
export class SoftDeleteVisitsDeliveries1791244800004 implements MigrationInterface {
  name = 'SoftDeleteVisitsDeliveries1791244800004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'aspid';

    await queryRunner.query(`
      ALTER TABLE ${s}.visit
        ADD COLUMN deleted_at timestamp with time zone NULL,
        ADD COLUMN deleted_by bigint NULL,
        ADD CONSTRAINT fk_visit_deleted_by FOREIGN KEY (deleted_by) REFERENCES ${s}."user" (id);

      ALTER TABLE ${s}.deliveries
        ADD COLUMN deleted_at timestamp with time zone NULL,
        ADD COLUMN deleted_by bigint NULL,
        ADD CONSTRAINT fk_deliveries_deleted_by FOREIGN KEY (deleted_by) REFERENCES ${s}."user" (id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'aspid';

    // Al revertir, los registros eliminados lógicamente se borran de verdad:
    // sin la columna volverían a aparecer como vigentes.
    await queryRunner.query(`
      DELETE FROM ${s}.deliveries WHERE deleted_at IS NOT NULL;
      ALTER TABLE ${s}.deliveries
        DROP CONSTRAINT fk_deliveries_deleted_by,
        DROP COLUMN deleted_by,
        DROP COLUMN deleted_at;

      DELETE FROM ${s}.visit WHERE deleted_at IS NOT NULL;
      ALTER TABLE ${s}.visit
        DROP CONSTRAINT fk_visit_deleted_by,
        DROP COLUMN deleted_by,
        DROP COLUMN deleted_at;
    `);
  }
}
