import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { User } from 'src/users/entities';

describe('DepartmentsController', () => {
  let controller: DepartmentsController;
  let service: DepartmentsService;

  const mockDepartmentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const mockAccessScopeService = { findDepartmentMembers: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentsController],
      providers: [
        {
          provide: DepartmentsService,
          useValue: mockDepartmentsService,
        },
        { provide: AccessScopeService, useValue: mockAccessScopeService },
      ],
    }).compile();

    controller = module.get<DepartmentsController>(DepartmentsController);
    service = module.get<DepartmentsService>(DepartmentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a department', async () => {
      const createDto: CreateDepartmentDto = { name: 'Ventas' };
      const expectedResult = {
        data: { id: 1, name: 'Ventas', isActive: true },
      };

      mockDepartmentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all departments with default pagination', async () => {
      const paginationDto: PaginationDto = {};
      const expectedResult = {
        data: [
          { id: 1, name: 'Ventas', isActive: true },
          { id: 2, name: 'Marketing', isActive: true },
        ],
      };

      mockDepartmentsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(paginationDto);

      expect(service.findAll).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(expectedResult);
    });

    it('should return departments with custom pagination', async () => {
      const paginationDto: PaginationDto = { limit: 10, offset: 5 };
      const expectedResult = {
        data: [{ id: 3, name: 'IT', isActive: true }],
      };

      mockDepartmentsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(paginationDto);

      expect(service.findAll).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a department by id', async () => {
      const departmentId = '1';
      const expectedResult = {
        data: { id: 1, name: 'Ventas', isActive: true },
      };

      mockDepartmentsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(departmentId);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedResult);
    });

    it('should convert string id to number', async () => {
      const departmentId = '42';
      const expectedResult = {
        data: { id: 42, name: 'Finanzas', isActive: true },
      };

      mockDepartmentsService.findOne.mockResolvedValue(expectedResult);

      await controller.findOne(departmentId);

      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });

  describe('update', () => {
    it('should update a department', async () => {
      const departmentId = '1';
      const updateDto: UpdateDepartmentDto = { name: 'Ventas Actualizadas' };
      const expectedResult = { data: updateDto };

      mockDepartmentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(departmentId, updateDto);

      expect(service.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should remove a department', async () => {
      const departmentId = '1';
      const expectedResult = {
        data: 'This action removes a #1 department',
      };

      mockDepartmentsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(departmentId);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedResult);
    });
  });

  it('should list the members of a department with the current user scope', async () => {
    // ARRANGE
    const user = { id: '5' } as unknown as User;
    const members = [{ id: 5, codUser: 'C001', fullName: 'Ana Ruiz' }];
    mockAccessScopeService.findDepartmentMembers.mockResolvedValue(members);

    // ACT
    const result = await controller.findMembers(3, user);

    // ASSERT
    expect(result).toEqual(members);
    expect(mockAccessScopeService.findDepartmentMembers).toHaveBeenCalledWith(
      user,
      3,
    );
  });
});
