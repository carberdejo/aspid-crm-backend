import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { QuoteCurrency } from 'src/quotes/interfaces/quote-currency.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'invoice' })
export class Invoice {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: number;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: number;

  @CreateDateColumn({
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

  // Relación: Muchas facturas pertenecen a una Orden de Compra
  @ManyToOne(() => PurchaseOrder, (order) => order.invoices)
  @JoinColumn({ name: 'order_id' })
  order: PurchaseOrder;
}
