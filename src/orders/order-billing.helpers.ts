import { EntityManager } from 'typeorm';
import { Invoice } from 'src/invoices/entities/invoice.entity';
import { Quote } from 'src/quotes/entities/quote.entity';
import { PurchaseOrder } from './entities/order.entity';
import { DocumentStatus } from './interfaces/document-status.enum';
import { PurchaseOrderNotFoundException } from './exceptions/order.exceptions';

/**
 * Bloquea la fila de la OC (SELECT ... FOR UPDATE) dentro de la transacción y trae
 * su cotización (dueño y área).
 *
 * Todo lo que cambia lo facturado de una OC (crear, editar o anular facturas; editar
 * o anular la OC) pasa por este bloqueo, así dos operaciones simultáneas sobre la
 * misma OC se ejecutan una tras otra y no pueden pasarse del total.
 */
export async function lockOrderWithQuote(manager: EntityManager, id: number) {
  // Se bloquea solo la OC: Postgres no permite FOR UPDATE sobre un LEFT JOIN
  const po = await manager.findOne(PurchaseOrder, {
    where: { id },
    lock: { mode: 'pessimistic_write' },
  });
  if (!po) throw new PurchaseOrderNotFoundException(id);

  const quote = await manager.findOneOrFail(Quote, {
    where: { id: po.quoteId },
  });
  return { po, quote };
}

/** Suma de las facturas vigentes de una OC (opcionalmente sin contar una de ellas) */
export async function sumActiveInvoices(
  manager: EntityManager,
  orderId: number,
  excludeInvoiceId?: number,
): Promise<number> {
  const qb = manager
    .createQueryBuilder(Invoice, 'invoice')
    .select('COALESCE(SUM(invoice.amount), 0)', 'total')
    .where('invoice.orderId = :orderId', { orderId })
    .andWhere('invoice.status = :status', { status: DocumentStatus.VIGENTE });

  if (excludeInvoiceId)
    qb.andWhere('invoice.id != :excludeInvoiceId', { excludeInvoiceId });

  const row = await qb.getRawOne<{ total: string }>();
  return Number(row?.total ?? 0);
}
