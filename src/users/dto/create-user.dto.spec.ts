import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';
import { Role } from '../interfaces/role.interface';

describe('CreateUserDto', () => {
  const validateDto = async (payload: any) => {
    const dto = plainToInstance(CreateUserDto, payload);
    const errors = await validate(dto);
    return { dto, errors };
  };

  const validUserPayload = {
    codUser: '2026001',
    firstName: 'Carlos',
    lastName: 'Berdejo',
    email: 'carlos@aspid.com',
    password: 'securePassword123',
    role: Role.ADMIN,
    country: 'Peru',
    phone: '987654321',
    departmentIds: [1, 2],
  };

  it('should validate a correct user payload', async () => {
    const { errors } = await validateDto(validUserPayload);
    expect(errors.length).toBe(0);
  });

  it('should fail if codUser is not a string', async () => {
    const { errors } = await validateDto({
      ...validUserPayload,
      codUser: 123,
    });
    expect(errors.find((e) => e.property === 'codUser')).toBeDefined();
  });

  it('should fail if firstName or lastName are empty', async () => {
    const { errors } = await validateDto({
      ...validUserPayload,
      firstName: '',
      lastName: '',
    });
    const firstError = errors.find((e) => e.property === 'firstName');
    const lastError = errors.find((e) => e.property === 'lastName');

    expect(firstError?.constraints).toHaveProperty('isNotEmpty');
    expect(lastError?.constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail with an invalid Role', async () => {
    const { errors } = await validateDto({
      ...validUserPayload,
      role: 'SUPER_ADMIN',
    });
    const roleError = errors.find((e) => e.property === 'role');

    expect(roleError?.constraints).toHaveProperty('isIn');
    expect(roleError?.constraints?.isIn).toContain(
      'El rol debe ser "admin" o "user"',
    );
  });

  it('should fail if departmentIds is empty or not an array', async () => {
    // Caso: Array vacío (ArrayMinSize(1))
    const { errors: emptyErrors } = await validateDto({
      ...validUserPayload,
      departmentIds: [],
    });
    expect(
      emptyErrors.find((e) => e.property === 'departmentIds'),
    ).toBeDefined();

    // Caso: No es array (IsArray)
    const { errors: notArrayErrors } = await validateDto({
      ...validUserPayload,
      departmentIds: '1',
    });
    expect(
      notArrayErrors.find((e) => e.property === 'departmentIds'),
    ).toBeDefined();
  });

  it('should fail if departmentIds contains non-number values', async () => {
    const { errors } = await validateDto({
      ...validUserPayload,
      departmentIds: [1, 'abc'],
    });
    const deptError = errors.find((e) => e.property === 'departmentIds');

    expect(deptError).toBeDefined();
    expect(deptError?.constraints).toHaveProperty('isNumber');
  });
});
