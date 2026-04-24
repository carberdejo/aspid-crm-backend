import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from './departments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Repository } from 'typeorm';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ApiException } from '../common/exceptions/api.exception';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Logger } from '@nestjs/common';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let repository: Repository<Department>;

  // Silenciar logs en tests (opcional - solo para limpiar la consola)
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  // Restaurar logs después de todos los tests
  afterAll(() => {
    jest.restoreAllMocks();
  });

  // Mock del QueryBuilder
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockRepository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        {
          provide: getRepositoryToken(Department),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
    repository = module.get<Repository<Department>>(
      getRepositoryToken(Department),
    );

    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDepartmentDto: CreateDepartmentDto = {
      name: 'Ventas',
    };

    it('should create a department successfully', async () => {
      const mockDepartment = {
        id: 1,
        name: 'Ventas',
        isActive: true,
      };

      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockDepartment);
      mockRepository.save.mockResolvedValue(mockDepartment);

      const result = await service.create(createDepartmentDto);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(department.name) = LOWER(:name)',
        { name: 'Ventas' },
      );
      expect(mockRepository.create).toHaveBeenCalledWith(createDepartmentDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockDepartment);
      // El servicio retorna un mensaje de éxito, no el objeto creado
      expect(result).toEqual({ data: 'Department created successfully' });
    });

    it('should throw ApiException if department already exists (case-insensitive)', async () => {
      const existingDepartment = {
        id: 1,
        name: 'VENTAS',
        isActive: true,
      };

      mockQueryBuilder.getOne.mockResolvedValue(existingDepartment);

      await expect(service.create(createDepartmentDto)).rejects.toThrow(
        ApiException,
      );
      await expect(service.create(createDepartmentDto)).rejects.toThrow(
        'Department already exists',
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ApiException if save fails', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ name: 'Ventas' });
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDepartmentDto)).rejects.toThrow(
        ApiException,
      );
      await expect(service.create(createDepartmentDto)).rejects.toThrow(
        'Failed to create department',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated departments with default pagination', async () => {
      const mockDepartments = [
        { id: 1, name: 'Ventas', isActive: true },
        { id: 2, name: 'Marketing', isActive: true },
      ];

      mockRepository.find.mockResolvedValue(mockDepartments);

      const paginationDto: PaginationDto = {};
      const result = await service.findAll(paginationDto);

      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
      });
      expect(result).toEqual({ data: mockDepartments });
    });

    it('should return paginated departments with custom pagination', async () => {
      const mockDepartments = [
        { id: 3, name: 'IT', isActive: true },
        { id: 4, name: 'RRHH', isActive: true },
      ];

      mockRepository.find.mockResolvedValue(mockDepartments);

      const paginationDto: PaginationDto = { limit: 10, offset: 20 };
      const result = await service.findAll(paginationDto);

      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
      });
      expect(result).toEqual({ data: mockDepartments });
    });

    it('should return empty array when no departments exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result).toEqual({ data: [] });
    });
  });

  describe('findOne', () => {
    it('should return a department by id', async () => {
      const mockDepartment = {
        id: 1,
        name: 'Ventas',
        isActive: true,
      };

      mockRepository.findOneBy.mockResolvedValue(mockDepartment);

      const result = await service.findOne(1);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      // El servicio retorna directamente el department, sin wrapper { data: ... }
      expect(result).toEqual(mockDepartment);
    });

    it('should throw ApiException if department not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(ApiException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Department not found',
      );
    });
  });

  describe('update', () => {
    it('should return the update dto (not implemented)', () => {
      const updateDto = { name: 'Ventas Actualizadas' };
      const result = service.update(1, updateDto);

      expect(result).toEqual({ data: updateDto });
    });
  });

  describe('remove', () => {
    it('should return a message (not implemented)', () => {
      const result = service.remove(1);

      expect(result).toEqual({ data: 'This action removes a #1 department' });
    });
  });
});
