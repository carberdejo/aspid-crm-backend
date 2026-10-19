import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { DocumentStatus } from 'src/orders/interfaces/document-status.enum';
import { QuoteCurrency } from 'src/quotes/interfaces/quote-currency.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'invoice' })
export class Invoice {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: number;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: number;

  // Fecha de emisión que indica el usuario (editable): columna normal, no de auditoría
  @Column({
    name: 'issue_date',
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  issueDate: Date;

  @Column({
    name: 'invoice_number',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  invoiceNumber: string;

  // TypeORM suele traer los decimales como string para no perder precisión,
  // por eso usamos el tipo numérico o lo parseamos en el servicio.
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: QuoteCurrency,
    default: QuoteCurrency.USD,
  })
  currency: QuoteCurrency;

  // Anulación (migración AnnulOrdersInvoices): el número de una factura anulada
  // queda reservado y no se vuelve a usar
  @Column({
    type: 'varchar',
    length: 20,
    default: DocumentStatus.VIGENTE,
  })
  status: DocumentStatus;

  @Column({
    name: 'annulled_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  annulledAt: Date | null;

  @Column({ name: 'annulled_by', type: 'bigint', nullable: true })
  annulledBy: number | null;

  @Column({ name: 'annul_reason', type: 'text', nullable: true })
  annulReason: string | null;

  // Relación: Muchas facturas pertenecen a una Orden de Compra
  @ManyToOne(() => PurchaseOrder, (order) => order.invoices)
  @JoinColumn({ name: 'order_id' })
  order: PurchaseOrder;
}
