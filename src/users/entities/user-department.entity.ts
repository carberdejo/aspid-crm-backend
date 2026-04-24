import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Department } from 'src/departments/entities/department.entity';

@Entity('user_departments')
export class UserDepartment {
  @ApiProperty({
    example: 10,
    description: 'ID único de la relación usuario-departamento',
  })
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: number;

  @ApiProperty({
    type: () => User,
    description: 'Datos del usuario asociado',
  })
  @ManyToOne(() => User, (user) => user.userDepartments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    type: () => Department,
    description: 'Datos del departamento asociado',
  })
  @ManyToOne(() => Department, (department) => department.userDepartments)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ApiProperty({
    example: '2026-03-31T15:00:00Z',
    description: 'Fecha y hora de asignación',
  })
  @Column('timestamp with time zone', {
    name: 'assigned_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  assignedAt: Date;
}
