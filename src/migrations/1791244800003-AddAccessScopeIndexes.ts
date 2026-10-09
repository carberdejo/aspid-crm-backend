import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índices para las consultas con alcance por empleado y área (AccessScopeService):
 * los listados filtran por (dueño, área) y ordenan/filtran por fecha, y las OC y
 * facturas llegan a la cotización por su clave foránea.
 */
export class AddAccessScopeIndexes1791244800003 implements MigrationInterface {
  name = 'AddAccessScopeIndexes1791244800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'concar1';

    await queryRunner.query(`
      CREATE INDEX idx_visit_user_dept_date ON ${s}.visit (user_id, department_id, date);
      CREATE INDEX idx_visit_client ON ${s}.visit (client_id);

      CREATE INDEX idx_quote_user_dept_created ON ${s}.quote (user_id, department_id, created_at);
      CREATE INDEX idx_quote_collaborator ON ${s}.quote (collaborator_id);
      CREATE INDEX idx_quote_client ON ${s}.quote (client_id);

      CREATE INDEX idx_po_quote ON ${s}.purchase_order (quote_id);

      CREATE INDEX idx_deliveries_user_dept_date ON ${s}.deliveries (user_id, department_id, delivery_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'concar1';

    await queryRunner.query(`
      DROP INDEX ${s}.idx_deliveries_user_dept_date;
      DROP INDEX ${s}.idx_po_quote;
      DROP INDEX ${s}.idx_quote_client;
      DROP INDEX ${s}.idx_quote_collaborator;
      DROP INDEX ${s}.idx_quote_user_dept_created;
      DROP INDEX ${s}.idx_visit_client;
      DROP INDEX ${s}.idx_visit_user_dept_date;
    `);
  }
}
