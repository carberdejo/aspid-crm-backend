import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ContactClient } from './contact-client.entity';
import { IndustrySegment } from 'src/catalogs/entities/industry-segment.entity';
import { Portfolio } from 'src/portfolios/entities/portfolio.entity';

@Entity({ name: 'client' })
export class Client {
  @ApiProperty({ example: 1, description: 'ID autogenerado del cliente' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({ example: 'Andina Soluciones' })
  @Column({ name: 'commercial_name', type: 'varchar', length: 100 })
  commercialName: string;

  @ApiProperty({ example: 'ANDINA SOLUCIONES GLOBALES S.A.C.' })
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

  @ApiProperty({ example: 'San Isidro', description: 'Distrito del cliente' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string;

  @ApiProperty({ example: 'Lima', description: 'Provincia del cliente' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @ApiProperty({ example: 'Este', description: 'Zona del cliente' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  zone: string;

  @ApiProperty({ example: 1, description: 'ID del segmento industrial' })
  @Column({ name: 'segment_id', type: 'bigint', nullable: true })
  segmentId: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la cartera a la que pertenece el cliente',
  })
  @Column({ type: 'bigint', name: 'portfolio_id', nullable: true })
  portfolioId: number;

  @ApiProperty({
    type: () => [ContactClient],
    description: 'Lista de contactos asociados',
  })
  @OneToMany(() => ContactClient, (contact) => contact.client)
  contacts: ContactClient[];

  // Aquí podrías agregar la relación con IndustrySegment si es necesario
  @ManyToOne(() => IndustrySegment)
  @JoinColumn({ name: 'segment_id' })
  segment: IndustrySegment;

  @ManyToOne(() => Portfolio)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;
}
