import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger'; // <-- Importar esto
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';
import { ContactClient } from '../../clients/entities/contact-client.entity';
import { Department } from 'src/departments/entities/department.entity';

@Entity({ name: 'visit', schema: 'concar1' })
export class Visit {
  @ApiProperty({ example: 1, description: 'ID único de la visita' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'ID del usuario que realiza la visita',
  })
  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ApiProperty({ example: 1, description: 'ID del cliente visitado' })
  @Column({ name: 'client_id', type: 'bigint' })
  clientId: number;

  @ApiProperty({
    example: 1,
    description: 'ID del contacto del cliente',
    nullable: true,
  })
  @Column({ name: 'contact_id', type: 'bigint', nullable: true })
  contactId: number;

  @ApiProperty({
    example: 1,
    description: 'ID del departamento asociado a la visita',
  })
  @Column({ name: 'department_id', type: 'bigint' })
  departmentId: number; // Campo para almacenar el ID del departamento asociado

  @ApiProperty({ example: '2026-03-31', description: 'Fecha de la visita' })
  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @ApiProperty({
    example: 'Discusión de requerimientos técnicos',
    description: 'Temas tratados en la visita',
    nullable: true,
  })
  @Column({ name: 'visit_topics', type: 'text', nullable: true })
  visitTopics: string;

  @ApiProperty({
    example: 'El cliente está interesado en el módulo de facturación',
    description: 'Resumen de los resultados obtenidos',
    nullable: true,
  })
  @Column({ name: 'outcome_summary', type: 'text', nullable: true })
  outcomeSummary: string;

  // Eliminado lógico: TypeORM excluye estas filas de las consultas de la entidad
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone' })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: number | null;

  // --- RELACIONES ---
  // Importante: Usar la función flecha () => Entity para evitar referencias circulares en Swagger

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: () => Client })
  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ApiProperty({ type: () => ContactClient })
  @ManyToOne(() => ContactClient)
  @JoinColumn({ name: 'contact_id' })
  contact: ContactClient;

  @Index('idx_visit_department_id') // Índice específico para el FK
  @ManyToOne(() => Department, (department) => department.visits)
  @JoinColumn({ name: 'department_id' })
  department: Department;
}
