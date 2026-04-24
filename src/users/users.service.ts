import { Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { ApiException } from 'src/common/exceptions/api.exception';
import { UserDepartment } from './entities/user-department.entity';
import * as bcrypt from 'bcrypt';
import { QueryUserDto } from './dto/query-user.dto';
import { DepartmentsService } from 'src/departments/departments.service';
import { Role, UserDetailResponseDto, UserListResponseDto } from './interfaces';

export interface UserResponse {
  codUser: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role: string;
  country: string;
  phone: string;
}

@Injectable()
export class UsersService {
  protected readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserDepartment)
    private readonly userDepartmentRepository: Repository<UserDepartment>,
    private readonly departmentsService: DepartmentsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { departmentIds, password, ...userData } = createUserDto;

    await this.validateCodUser(userData.codUser);
    await this.validateEmail(userData.email);
    await this.validateDepartmentIds(departmentIds);

    try {
      const passwordHash: string = await bcrypt.hash(password, 10);
      // Creamos la instancia del usuario incluyendo sus departamentos
      const newUser = this.userRepository.create({
        ...userData,
        password: passwordHash,
        userDepartments: departmentIds.map((depId) =>
          this.userDepartmentRepository.create({ department: { id: depId } }),
        ), // Los pasamos aquí mismo
      });

      await this.userRepository.save(newUser);

      return {
        message: `User created successfully with codUser: ${userData.codUser}`,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error creating user: ${userData.codUser}`);
      throw new ApiException(500, 'Error al crear usuario con departamentos', [
        errorMessage,
      ]);
    }
  }

  async findAll(queryUserDto: QueryUserDto) {
    const { limit = 10, offset = 0, name, codUser } = queryUserDto;
    // 1. Creamos el QueryBuilder con las relaciones necesarias
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userDepartments', 'userDept')
      .leftJoinAndSelect('userDept.department', 'dept');

    // 2. Aplicamos filtros dinámicos (Búsqueda por inicio de palabra)
    if (name) {
      queryBuilder.andWhere('user.firstName ILike :name', {
        name: `%${name}%`,
      });
    }

    if (codUser) {
      queryBuilder.andWhere('user.codUser = :codUser', { codUser });
    }

    const [users, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    this.logger.log(
      `Cantidad de usuarios encontrados: ${users.length} de ${total} total`,
    );

    return {
      data: {
        items: users.map((user) => this.mapToListResponse(user)),
        total,
        limit,
        offset,
      },
    };
  }

  async findOne(codUser: string) {
    const user = await this.userRepository.findOne({
      where: { codUser },
      relations: ['userDepartments', 'userDepartments.department'], // Cargamos también los departamentos relacionados
    });
    if (!user) {
      this.logger.warn(`User with codUser ${codUser} not found`);
      throw new ApiException(404, 'CodUser not found', []);
    }
    this.logger.log(`User with codUser ${codUser} found: ${user.email}`);
    return this.mapToDetailResponse(user);
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return { data: updateUserDto };
  // }

  async remove(codUser: string) {
    const userEntity = await this.userRepository.findOneBy({ codUser });
    if (!userEntity || userEntity.isActive === false) {
      this.logger.warn(
        `User with codUser ${codUser} not found or already inactive`,
      );
      throw new ApiException(400, 'CodUser not found or already inactive', []);
    }
    try {
      userEntity.isActive = false;
      await this.userRepository.save(userEntity);
      return { message: `User #${codUser} deactivated successfully` };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error deactivating user with codUser ${codUser}`);
      throw new ApiException(500, 'Error al desactivar usuario', [
        errorMessage,
      ]);
    }
  }

  async validateCodUser(codUser: string) {
    const userCodUser = await this.userRepository.findOneBy({
      codUser: codUser,
    });
    if (userCodUser != null) {
      throw new ApiException(400, 'User code already exists', []);
    }
  }
  async validateEmail(email: string) {
    const userEmail = await this.userRepository.findOneBy({
      email: email,
    });
    if (userEmail != null) {
      throw new ApiException(400, 'User email already exists', []);
    }
  }
  async validateDepartmentIds(departmentIds: number[]) {
    for (const depId of departmentIds) {
      await this.departmentsService.findOne(depId);
    }
  }

  // Mapeo para el Detalle (findOne)
  private mapToDetailResponse(user: User): UserDetailResponseDto {
    return {
      codUser: user.codUser,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isActive,
      role: user.role,
      country: user.country,
      phone: user.phone,
      userDepartments: user.userDepartments.map((ud) => ({
        id: ud.id.toString(),
        assignedAt: ud.assignedAt,
        department: {
          id: ud.department.id,
          name: ud.department.name,
          isActive: ud.department.isActive,
        },
      })),
    };
  }

  // Mapeo para el Listado (findAll)
  private mapToListResponse(user: User): UserListResponseDto {
    return {
      codUser: user.codUser,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role as Role,
      isActive: user.isActive,
      departments: user.userDepartments?.map((ud) => ud.department.name) || [],
    };
  }
}
