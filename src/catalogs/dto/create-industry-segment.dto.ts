import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class CreateIndustrySegmentDto {
  @IsString()
  @IsNotEmpty({ message: 'El código del segmento es obligatorio' })
  @MaxLength(20, { message: 'El código no puede superar los 20 caracteres' })
  @Matches(/^[A-Z0-9&]+$/, {
    message:
      'El código solo puede contener letras mayúsculas, números y el símbolo &',
  })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del segmento es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  name: string;
}
