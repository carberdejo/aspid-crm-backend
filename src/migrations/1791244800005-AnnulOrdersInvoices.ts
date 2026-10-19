import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Anulación de órdenes de compra y facturas: el documento no se borra, pasa de
 * VIGENTE a ANULADA con fecha, autor y motivo. Los totales de facturación solo
 * cuentan los documentos vigentes.
 *
 * - Una cotización solo puede tener una OC vigente (al anular la OC vuelve a PENDIENTE
 *   y se puede generar otra).
 * - El número de OC lo da el cliente: se puede reusar si la OC anterior está anulada.
 * - El número de factura queda reservado aunque se anule (se mantiene uk_invoice_number).
 *
 * Si hubiera datos que violen las nuevas reglas, la creación de los índices falla y
 * la migración se revierte completa.
 */
export class AnnulOrdersInvoices1791244800005 implements MigrationInterface {
  name = 'AnnulOrdersInvoices1791244800005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'concar1';

    await queryRunner.query(`
      ALTER TABLE ${s}.purchase_order
        ADD COLUMN status varchar(20) NOT NULL DEFAULT 'VIGENTE',
        ADD COLUMN annulled_at timestamp with time zone NULL,
        ADD COLUMN annulled_by bigint NULL,
        ADD COLUMN annul_reason text NULL,
        ADD CONSTRAINT fk_po_annulled_by FOREIGN KEY (annulled_by) REFERENCES ${s}."user" (id),
        ADD CONSTRAINT chk_po_status CHECK (
          (status = 'VIGENTE' AND annulled_at IS NULL)
          OR (status = 'ANULADA' AND annulled_at IS NOT NULL AND annul_reason IS NOT NULL)
        );

      ALTER TABLE ${s}.invoice
        ADD COLUMN status varchar(20) NOT NULL DEFAULT 'VIGENTE',
        ADD COLUMN annulled_at timestamp with time zone NULL,
        ADD COLUMN annulled_by bigint NULL,
        ADD COLUMN annul_reason text NULL,
        ADD CONSTRAINT fk_invoice_annulled_by FOREIGN KEY (annulled_by) REFERENCES ${s}."user" (id),
        ADD CONSTRAINT chk_invoice_status CHECK (
          (status = 'VIGENTE' AND annulled_at IS NULL)
          OR (status = 'ANULADA' AND annulled_at IS NOT NULL AND annul_reason IS NOT NULL)
        );

      -- El número de OC solo es único entre las vigentes
      ALTER TABLE ${s}.purchase_order DROP CONSTRAINT uk_po_number;
      CREATE UNIQUE INDEX uk_po_number_active ON ${s}.purchase_order (po_number)
        WHERE status = 'VIGENTE';

      -- Una sola OC vigente por cotización
      CREATE UNIQUE INDEX uk_po_active_quote ON ${s}.purchase_order (quote_id)
        WHERE status = 'VIGENTE';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'concar1';

    // Revertir falla si hay números de OC repetidos (reusados tras una anulación):
    // en ese caso hay que resolverlos a mano antes de volver a la restricción global
    await queryRunner.query(`
      DROP INDEX ${s}.uk_po_active_quote;
      DROP INDEX ${s}.uk_po_number_active;
      ALTER TABLE ${s}.purchase_order ADD CONSTRAINT uk_po_number UNIQUE (po_number);

      ALTER TABLE ${s}.invoice
        DROP CONSTRAINT chk_invoice_status,
        DROP CONSTRAINT fk_invoice_annulled_by,
        DROP COLUMN annul_reason,
        DROP COLUMN annulled_by,
        DROP COLUMN annulled_at,
        DROP COLUMN status;

      ALTER TABLE ${s}.purchase_order
        DROP CONSTRAINT chk_po_status,
        DROP CONSTRAINT fk_po_annulled_by,
        DROP COLUMN annul_reason,
        DROP COLUMN annulled_by,
        DROP COLUMN annulled_at,
        DROP COLUMN status;
    `);
  }
}
