import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateUserClientExceptionDto } from './create-user-client-exception.dto';

export class UpdateUserClientExceptionDto extends PartialType(
  CreateUserClientExceptionDto,
) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
