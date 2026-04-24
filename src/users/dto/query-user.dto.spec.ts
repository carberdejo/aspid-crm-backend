import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryUserDto } from './query-user.dto';

describe('QueryUserDto', () => {
  const validateDto = async (payload: any) => {
    const dto = plainToInstance(QueryUserDto, payload);
    const errors = await validate(dto);
    return { dto, errors };
  };

  it('should validate an empty query (all fields are optional)', async () => {
    const { errors } = await validateDto({});
    expect(errors.length).toBe(0);
  });

  it('should validate with inherited pagination fields', async () => {
    // Probamos limit y offset que vienen de PaginationDto
    const { dto, errors } = await validateDto({ limit: '15', offset: '5' });

    expect(errors.length).toBe(0);
    expect(dto.limit).toBe(15); // Verificamos que heredó la transformación @Type
    expect(dto.offset).toBe(5);
  });

  it('should fail if inherited pagination fields are invalid', async () => {
    // Si PaginationDto tiene @Min(1) en limit, esto debería fallar
    const { errors } = await validateDto({ limit: 0 });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should validate correctly with string codUser', async () => {
    // Ahora que es string, debe aceptar códigos con letras y guiones
    const { dto, errors } = await validateDto({ codUser: 'USR-2026-ABC' });

    expect(errors.length).toBe(0);
    expect(typeof dto.codUser).toBe('string');
    expect(dto.codUser).toBe('USR-2026-ABC');
  });

  it('should fail if name is not a string', async () => {
    // Probamos otro campo para asegurar que la validación de tipos sigue funcionando
    const { errors } = await validateDto({ name: 12345 });

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
  });
});
