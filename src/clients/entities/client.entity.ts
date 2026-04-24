import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ContactClient } from './contact-client.entity';

@Entity({ name: 'client' })
export class Client {
  @ApiProperty({ example: 1, description: 'ID autogenerado del cliente' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({ example: 'ACME Soluciones' })
  @Column({ name: 'commercial_name', type: 'varchar', length: 100 })
  commercialName: string;

  @ApiProperty({ example: 'ACME SOLUCIONES GLOBALES S.A.C.' })
  @Column({ name: 'business_name', type: 'varchar', length: 100 })
  businessName: string;

  @ApiProperty({ example: '20123456789' })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  ruc: string;

  @ApiProperty({ example: 'Av. Las Camelias 123, San Isidro' })
  @Column({ type: 'varchar', length: 255 })
  address: string;

  @ApiProperty({ example: '2026-03-31T12:00:00Z' })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ApiProperty({
    type: () => [ContactClient],
    description: 'Lista de contactos asociados',
  })
  @OneToMany(() => ContactClient, (contact) => contact.client)
  contacts: ContactClient[];
}
