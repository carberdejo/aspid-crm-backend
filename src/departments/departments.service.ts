import { Injectable, Logger } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  DepartmentNotFoundException,
  DepartmentAlreadyExistsException,
} from './exceptions/department.exceptions';

@Injectable()
export class DepartmentsService {
  protected readonly logger = new Logger(DepartmentsService.name);
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}
  async create(createDepartmentDto: CreateDepartmentDto) {
    this.logger.log(`Creando departamento: ${createDepartmentDto.name}`);

    const existingDepartment = await this.departmentRepository
      .createQueryBuilder('department')
      .where('LOWER(department.name) = LOWER(:name)', {
        name: createDepartmentDto.name,
      })
      .getOne();

    if (existingDepartment) {
      throw new DepartmentAlreadyExistsException(createDepartmentDto.name);
    }

    const newDepartment = this.departmentRepository.create(createDepartmentDto);
    const savedDepartment = await this.departmentRepository.save(newDepartment);

    this.logger.log(
      `Departamento creado exitosamente con ID: ${savedDepartment.id}`,
    );

    return {
      message: 'Departamento creado exitosamente',
    };
  }

  async findAll(paginationDto: PaginationDto) {
    this.logger.log('Obteniendo lista de departamentos');

    const { limit = 5, offset = 0 } = paginationDto;
    const [departments, total] = await this.departmentRepository.findAndCount({
      skip: offset,
      take: limit,
    });

    return {
      data: {
        items: departments,
        total,
        limit: +limit,
        offset: +offset,
      },
    };
  }

  async findOne(id: number) {
    this.logger.log(`Buscando departamento con ID: ${id}`);

    const department = await this.departmentRepository.findOneBy({ id });
    if (!department) throw new DepartmentNotFoundException(id);

    return department;
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    this.logger.log(`Actualizando departamento con ID: ${id}`);

    const department = await this.departmentRepository.findOneBy({ id });
    if (!department) throw new DepartmentNotFoundException(id);

    if (updateDepartmentDto.name) {
      const existingDepartment = await this.departmentRepository
        .createQueryBuilder('department')
        .where('LOWER(department.name) = LOWER(:name)', {
          name: updateDepartmentDto.name,
        })
        .andWhere('department.id != :id', { id })
        .getOne();

      if (existingDepartment)
        throw new DepartmentAlreadyExistsException(updateDepartmentDto.name);
    }

    const updatedDepartment = await this.departmentRepository.save({
      ...department,
      ...updateDepartmentDto,
    });

    this.logger.log(`Departamento con ID ${id} actualizado exitosamente`);

    return {
      message: 'Departamento actualizado exitosamente',
      data: updatedDepartment,
    };
  }

  async remove(id: number) {
    this.logger.log(`Eliminando departamento con ID: ${id}`);

    const department = await this.departmentRepository.findOneBy({ id });
    if (!department) throw new DepartmentNotFoundException(id);

    await this.departmentRepository.remove(department);

    this.logger.log(`Departamento con ID ${id} eliminado exitosamente`);

    return {
      message: 'Departamento eliminado exitosamente',
    };
  }
}
