import { Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { UserDepartment } from './entities/user-department.entity';
import * as bcrypt from 'bcrypt';
import { QueryUserDto } from './dto/query-user.dto';
import { DepartmentsService } from 'src/departments/departments.service';
import {
  UsersCodUserAlreadyExistsException,
  UsersEmailAlreadyExistsException,
  UsersNotFoundException,
} from './exceptions/users.exceptions';
import { UserMapper } from './mappers/users.mapper';
import { UpdateUserDto } from './dto/update-user.dto';

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

    private readonly dataSource: DataSource,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { departmentIds, password, ...userData } = createUserDto;

    await this.validateCodUser(userData.codUser);
    await this.validateEmail(userData.email);
    await this.validateDepartmentIds(departmentIds);

    const passwordHash: string = await bcrypt.hash(password, 10);
    // Creamos la instancia del usuario incluyendo sus departamentos
    const newUser = this.userRepository.create({
      ...userData,
      password: passwordHash,
      userDepartments: departmentIds.map((depId) =>
        this.userDepartmentRepository.create({ department: { id: depId } }),
      ),
    });

    await this.userRepository.save(newUser);

    return {
      message: `User created successfully with codUser: ${userData.codUser}`,
    };
  }

  async findAll(queryUserDto: QueryUserDto) {
    const { limit = 10, offset = 0, term, departmentId } = queryUserDto;
    const isActive = this.normalizeBoolean(queryUserDto.isActive);

    console.log({ term, departmentId, isActive });
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userDepartments', 'userDept')
      .leftJoinAndSelect('userDept.department', 'dept');

    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('user.firstName ILike :term', { term: `%${term}%` })
            .orWhere('user.lastName ILike :term', { term: `%${term}%` })
            .orWhere('user.codUser ILike :term', { term: `%${term}%` });
        }),
      );
    }

    if (departmentId) {
      queryBuilder.andWhere('dept.id = :departmentId', { departmentId });
    }

    if (isActive !== undefined && isActive !== null)
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });

    const [users, total] = await queryBuilder
      // .orderBy('user.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    this.logger.log(
      `Cantidad de usuarios encontrados: ${users.length} de ${total} total`,
    );

    return {
      data: {
        items: UserMapper.toManyListResponse(users),
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
    if (!user) throw new UsersNotFoundException(Number(codUser));

    this.logger.log(`User with codUser ${codUser} found: ${user.email}`);
    return UserMapper.toDetailResponse(user);
  }

  async update(codUser: string, updateUserDto: UpdateUserDto) {
    const { departmentIds, password, ...userData } = updateUserDto;

    const user = await this.userRepository.findOne({
      where: { codUser },
      relations: ['userDepartments'],
    });
    if (!user) throw new UsersNotFoundException(Number(codUser));

    if (userData.email && userData.email !== user.email) {
      await this.validateEmail(userData.email);
    }
    // incio de la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (password) user.password = await bcrypt.hash(password, 10);

      //  Actualizar campos básicos
      Object.assign(user, userData);

      //  Gestionar Departamentos dentro de la transacción
      if (departmentIds) {
        await this.validateDepartmentIds(departmentIds);

        // Usamos el manager del queryRunner para asegurar que sea parte de la transacción
        await queryRunner.manager.delete(UserDepartment, {
          user: { id: user.id },
        });

        user.userDepartments = departmentIds.map((depId) =>
          queryRunner.manager.create(UserDepartment, {
            department: { id: depId },
          }),
        );
      }
      // Guardamos todo
      await queryRunner.manager.save(user);
      // Si todo salió bien, confirmamos los cambios
      await queryRunner.commitTransaction();

      // 8. Retornamos la data fresca (reutilizando findOne)
      return {
        message: `Usuario ${codUser} actualizado exitosamente`,
        data: await this.findOne(codUser), // Ya viene mapeado por el findOne
      };
    } catch (error) {
      // Si algo falla, deshacemos TODO (el delete y el save)
      await queryRunner.rollbackTransaction();
      throw error; // El HttpExceptionFilter lo atrapará
    } finally {
      // IMPORTANTE: Liberar el queryRunner
      await queryRunner.release();
    }
  }

  async remove(codUser: string) {
    const userEntity = await this.userRepository.findOneBy({ codUser });
    if (!userEntity || userEntity.isActive === false)
      throw new UsersNotFoundException(Number(codUser));

    userEntity.isActive = false;
    await this.userRepository.save(userEntity);
    return { message: `User #${codUser} deactivated successfully` };
  }

  // --- Helpers de Validación ---

  async validateCodUser(codUser: string) {
    const userCodUser = await this.userRepository.findOneBy({
      codUser: codUser,
    });
    if (userCodUser != null)
      throw new UsersCodUserAlreadyExistsException(codUser);
  }
  async validateEmail(email: string) {
    const userEmail = await this.userRepository.findOneBy({
      email: email,
    });
    if (userEmail != null) throw new UsersEmailAlreadyExistsException(email);
  }
  private async validateDepartmentIds(departmentIds: number[]) {
    await Promise.all(
      departmentIds.map((id) => this.departmentsService.findOne(id)),
    );
  }

  // Helper privado al final del servicio
  private normalizeBoolean(value: any): boolean | undefined {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  }
}
