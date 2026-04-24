import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateDepartmentDto } from './create-department.dto';

describe('CreateDepartmentDto', () => {
  it('should be defined', async () => {
    const dto = new CreateDepartmentDto();
    dto.name = 'HR';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
