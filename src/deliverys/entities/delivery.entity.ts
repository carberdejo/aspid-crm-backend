import { Client } from 'src/clients/entities';
import { User } from 'src/users/entities';
import { Department } from 'src/departments/entities/department.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DeliveryItem } from '../interfaces/delivery-item.interface';

@Entity({ name: 'deliveries' })
export class Delivery {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  // Relación con Cliente (Opcional, según tu SQL: NULL)
  @Column({ name: 'client_id', type: 'bigint', nullable: true })
  clientId: number | null;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  // Relación con Usuario (Requerido)
  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Área en la que se hizo la entrega (migración AddDepartmentToDeliveries).
  // NULL solo en entregas antiguas que no se pudieron asignar automáticamente.
  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({
    name: 'delivery_date',
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  deliveryDate: Date;

  // El campo clave: JSONB
  @Column({ name: 'delivery_items', type: 'jsonb', default: [] })
  deliveryItems: DeliveryItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
