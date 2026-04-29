import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';
import { ContactClient } from '../../clients/entities/contact-client.entity';
import { QuoteStatus } from '../interfaces/quote-status.enum';

@Entity({ name: 'quote' })
export class Quote {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'quote_number', type: 'varchar', length: 50, unique: true })
  quoteNumber: string;

  @Column({ name: 'client_id', type: 'bigint' })
  clientId: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ name: 'contact_id', type: 'bigint', nullable: true })
  contactId: number;

  @Column({ name: 'department_id', type: 'bigint' })
  departmentId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 50, default: QuoteStatus.PENDIENTE })
  status: string;

  @Column({
    name: 'status_reason',
    type: 'text',
    nullable: true,
  })
  statusReason: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string;

  @Column({ name: 'order_type', type: 'varchar', length: 50, nullable: true })
  orderType: string;

  @Column({ name: 'collaborator_id', type: 'bigint', nullable: true })
  collaboratorId: number;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // --- RELACIONES ---

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ContactClient)
  @JoinColumn({ name: 'contact_id' })
  contact: ContactClient;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'collaborator_id' }) // Debe coincidir con el name de arriba
  collaborator: User;
}
