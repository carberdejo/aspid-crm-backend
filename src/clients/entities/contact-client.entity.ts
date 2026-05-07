import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity({ name: 'contact_client', schema: 'concar1' })
export class ContactClient {
  @ApiProperty({ example: 1, description: 'ID único del contacto' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({ example: 'Juan' })
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @ApiProperty({ example: 'Gerente de Compras' })
  @Column({ type: 'varchar', length: 100 })
  position: string;

  @ApiProperty({ example: '987654321' })
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'country_code', type: 'varchar', length: 5, default: '51' })
  countryCode: string;

  @ApiProperty({ example: 'juan.perez@empresa.com' })
  @Column({ type: 'varchar', length: 100 })
  email: string;

  @ApiProperty({ example: 1, description: 'ID de la empresa asociada' })
  @Column({ name: 'client_id', type: 'bigint' })
  clientId: number;

  @ApiProperty({ type: () => Client, description: 'Datos de la empresa' })
  @ManyToOne(() => Client, (client) => client.contacts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_id' })
  client: Client;
}
