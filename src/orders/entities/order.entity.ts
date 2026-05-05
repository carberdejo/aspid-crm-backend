import { Quote } from 'src/quotes/entities/quote.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';

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

  @OneToOne(() => Quote)
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;
}
