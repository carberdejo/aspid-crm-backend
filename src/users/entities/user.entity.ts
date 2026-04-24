import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserDepartment } from './user-department.entity';
import { UserSession } from '.';

@Entity('user')
export class User {
  @ApiProperty({
    example: 1,
    description: 'ID interno autogenerado por Postgres',
  })
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 'USR-2026-001',
    description: 'Código de identificación único del usuario',
  })
  @Column({ name: 'cod_user', type: 'varchar', length: 50, unique: true })
  codUser: string;

  @ApiProperty({ example: 'Carlos', description: 'Nombre del usuario' })
  @Column('varchar', { name: 'first_name', nullable: true })
  firstName: string;

  @ApiProperty({ example: 'Berdejo', description: 'Apellido del usuario' })
  @Column('varchar', { name: 'last_name', nullable: true })
  lastName: string;

  @ApiProperty({ example: 'carlos@concar.com', description: 'Email único' })
  @Column('varchar', { unique: true, nullable: false })
  email: string;

  @Exclude() // Oculta en la respuesta JSON
  @Column('varchar', { nullable: false })
  password: string;

  @ApiProperty({ example: true, description: 'Estado de la cuenta' })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({
    example: 'admin',
    description: 'Rol del usuario en el sistema',
  })
  @Column('varchar', { nullable: true })
  role: string;

  @ApiProperty({ example: 'Perú', description: 'País de origen' })
  @Column('varchar', { nullable: true })
  country: string;

  @ApiProperty({ example: '+51987654321', description: 'Número de contacto' })
  @Column('varchar', { nullable: true })
  phone: string;

  @ApiProperty({
    type: () => [UserDepartment],
    description: 'Relación con los departamentos asignados',
  })
  @OneToMany(() => UserDepartment, (userDepartment) => userDepartment.user, {
    cascade: true,
  })
  userDepartments: UserDepartment[];

  // Relación Uno a Muchos con las Sesiones
  @OneToMany(() => UserSession, (session) => session.user, {
    onDelete: 'CASCADE',
  })
  sessions: UserSession[];
}
