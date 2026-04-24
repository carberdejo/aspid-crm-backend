import { ApiProperty } from '@nestjs/swagger';
import { UserDepartment } from 'src/users/entities/user-department.entity';
import { Visit } from 'src/visits/entities/visit.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('department')
export class Department {
  @ApiProperty({
    example: '1',
    description: 'Department unique identifier',
    uniqueItems: true,
  })
  @PrimaryGeneratedColumn('identity')
  id: number;

  @ApiProperty({
    example: 'Ventas',
    description: 'Department name',
    uniqueItems: true,
  })
  @Column('varchar', { unique: true, nullable: false })
  name: string;

  @ApiProperty({
    example: 'true',
    description: 'Department active status',
  })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(
    () => UserDepartment,
    (userDepartment) => userDepartment.department,
  )
  userDepartments: UserDepartment[];

  @OneToMany(() => Visit, (visit) => visit.department)
  visits: Visit[];
}
