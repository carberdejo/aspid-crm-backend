import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PortfolioUser } from './portfolio-user.entity';

@Entity({ name: 'portfolio' })
export class Portfolio {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // INDUSTRIAL, DISTRIBUIDOR...

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  zone: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Relación a la tabla intermedia
  @OneToMany(() => PortfolioUser, (portfolioUser) => portfolioUser.portfolio, {
    cascade: true,
  })
  users: PortfolioUser[];
}
