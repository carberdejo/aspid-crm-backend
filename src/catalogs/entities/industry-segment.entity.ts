import { Client } from 'src/clients/entities';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity({ name: 'industry_segment' })
export class IndustrySegment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string; // Ej: 'AC', 'F&B'

  @Column({ type: 'varchar', length: 100 })
  name: string; // Ej: 'Acería', 'Alimentos y Bebidas'

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Relación inversa: Un segmento puede tener muchos clientes
  @OneToMany(() => Client, (client) => client.segment)
  clients: Client[];
}
