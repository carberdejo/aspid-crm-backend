import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserDepartment } from './entities/user-department.entity';
import { DepartmentsModule } from 'src/departments/departments.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserSession } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDepartment, UserSession]),
    DepartmentsModule,
    AuthModule,
  ], // Aquí puedes agregar tus entidades de TypeORM relacionadas con los usuarios
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
