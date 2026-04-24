import 'reflect-metadata';
import { validate } from 'class-validator';
import { PaginationDto } from './pagination.dto';
import { plainToInstance } from 'class-transformer';

describe('PaginationDto', () => {
  // Función auxiliar para transformar y validar en un solo paso
  const validateDto = async (payload: any) => {
    const dto = plainToInstance(PaginationDto, payload);
    const errors = await validate(dto);
    return { dto, errors };
  };

  it('should validate with empty object (default values)', async () => {
    const { errors } = await validateDto({});
    expect(errors.length).toBe(0);
  });

  it('should validate and transform string numbers to integers', async () => {
    const { dto, errors } = await validateDto({ offset: '5', limit: '25' });

    expect(errors.length).toBe(0);
    expect(typeof dto.offset).toBe('number'); // Verifica transformación
    expect(dto.offset).toBe(5);
    expect(dto.limit).toBe(25);
  });

  it('should fail when values are not numbers', async () => {
    const { errors } = await validateDto({ offset: 'esto_no_es_un_numero' });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('offset');
  });

  it('should fail with negative offset', async () => {
    const { errors } = await validateDto({ offset: -1 });

    expect(errors.length).toBeGreaterThan(0);
    // Es mejor verificar el constraint específico si lo tienes (ej: min)
    expect(errors[0].constraints).toHaveProperty('min');
  });

  it('should fail when limit is below minimum (1)', async () => {
    const { errors } = await validateDto({ limit: 0 });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.find((e) => e.property === 'limit')).toBeDefined();
  });

  it('should validate and transform string dates to Date objects', async () => {
    const payload = {
      startDate: '2026-03-01',
      endDate: '2026-03-30T11:00:00Z',
    };
    const { dto, errors } = await validateDto(payload);

    expect(errors.length).toBe(0);
    expect(dto.startDate).toBeInstanceOf(Date);
    expect(dto.endDate).toBeInstanceOf(Date);
    // Verificamos que el año sea el correcto tras la transformación
    expect(dto.startDate?.getUTCFullYear()).toBe(2026);
  });

  it('should fail when dates are invalid strings', async () => {
    const { errors } = await validateDto({
      startDate: 'esto-no-es-una-fecha',
      endDate: '2026-13-45', // Mes/día inexistente
    });

    expect(errors.length).toBeGreaterThan(0);
    const startError = errors.find((e) => e.property === 'startDate');
    const endError = errors.find((e) => e.property === 'endDate');

    expect(startError?.constraints).toHaveProperty('isDate');
    expect(endError?.constraints).toHaveProperty('isDate');
  });

  it('should validate when dates are missing (as they are optional)', async () => {
    const { errors } = await validateDto({ limit: 10 }); // Solo mandamos limit
    expect(errors.length).toBe(0);
  });
});
