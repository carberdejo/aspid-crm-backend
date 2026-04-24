import { Injectable, Logger } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiException } from 'src/common/exceptions/api.exception';

@Injectable()
export class DepartmentsService {
  protected readonly logger = new Logger(DepartmentsService.name);
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}
  async create(createDepartmentDto: CreateDepartmentDto) {
    // Búsqueda case-insensitive usando ILIKE (PostgreSQL)
    const existingDepartment = await this.departmentRepository
      .createQueryBuilder('department')
      .where('LOWER(department.name) = LOWER(:name)', {
        name: createDepartmentDto.name,
      })
      .getOne();

    if (existingDepartment) {
      throw new ApiException(400, 'Department already exists', []);
    }

    try {
      const newDepartment =
        this.departmentRepository.create(createDepartmentDto);
      await this.departmentRepository.save(newDepartment);
      return { data: `Department created successfully` };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.logger.error('Failed to create department', { cause: error });
      throw new ApiException(500, 'Failed to create department', []);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 5, offset = 0 } = paginationDto;
    const departments = await this.departmentRepository.find({
      skip: offset,
      take: limit,
    });
    return { data: departments };
  }

  async findOne(id: number) {
    const department = await this.departmentRepository.findOneBy({ id });
    if (!department) throw new ApiException(404, 'Department not found', []);
    return department;
  }

  update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    return { data: updateDepartmentDto };
  }

  remove(id: number) {
    return { data: `This action removes a #${id} department` };
  }
}
