import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Portfolio } from './portfolio.entity';
import { User } from 'src/users/entities';

@Entity({ name: 'portfolio_users' })
export class PortfolioUser {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'portfolio_id' })
  portfolioId: number;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 50, name: 'role_in_portfolio' })
  roleInPortfolio: string; // RESPONSABLE, ING_PROYECTOS, SERVICIOS

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.users)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
