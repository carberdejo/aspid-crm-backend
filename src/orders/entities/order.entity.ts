import { Invoice } from 'src/invoices/entities/invoice.entity';
import { Quote } from 'src/quotes/entities/quote.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BillingStatus } from '../interfaces/billing-status.enum';
import { QuoteCurrency } from 'src/quotes/interfaces/quote-currency.enum';

@Entity({ name: 'purchase_order' })
export class PurchaseOrder {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'po_number', length: 100 })
  poNumber: string;

  @Column({ name: 'received_at', type: 'date', nullable: true })
  receivedAt: Date;

  @Column({ name: 'quote_id', type: 'bigint' })
  quoteId: number;

  @Column({
    name: 'billing_status',
    type: 'enum',
    enum: BillingStatus,
    default: BillingStatus.PENDIENTE_FACTURACION,
  })
  billingStatus: BillingStatus;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2, // 2 decimales
    default: 0,
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: QuoteCurrency,
    default: QuoteCurrency.USD,
  })
  currency: QuoteCurrency;

  @OneToOne(() => Quote)
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  // Relación: Una OC puede tener muchas Facturas (parciales o una sola completa)
  @OneToMany(() => Invoice, (invoice) => invoice.order)
  invoices: Invoice[];
}
