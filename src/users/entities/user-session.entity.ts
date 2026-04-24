import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '.';
import { Exclude } from 'class-transformer';

@Entity({ name: 'user_session' })
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: number;
  @Exclude() // No se incluirá en la respuesta JSON
  @Column({ name: 'refresh_token_hash' })
  refreshTokenHash: string;

  @Column({ name: 'device_info', nullable: true })
  deviceInfo: string;

  @Column({ name: 'ip_address', nullable: true, length: 45 })
  ipAddress: string;

  @CreateDateColumn({ name: 'last_active', type: 'timestamp' })
  lastActive: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  // Relación Muchos a Uno con User
  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
