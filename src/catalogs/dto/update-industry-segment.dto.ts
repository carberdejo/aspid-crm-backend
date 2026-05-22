import { PartialType } from '@nestjs/mapped-types'; // Si usas swagger, cambia esto a '@nestjs/swagger'
import { CreateIndustrySegmentDto } from './create-industry-segment.dto';
// import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateIndustrySegmentDto extends PartialType(
  CreateIndustrySegmentDto,
) {
  //   @IsBoolean()
  //   @IsOptional()
  //   isActive?: boolean;
}
