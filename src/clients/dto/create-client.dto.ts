import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({
    description: 'Nombre comercial de la empresa',
    example: 'ACME Soluciones',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre comercial es obligatorio' })
  @MaxLength(100)
  commercialName: string;

  @ApiProperty({
    description: 'Razón social legal de la empresa',
    example: 'ACME SOLUCIONES GLOBALES S.A.C.',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  @MaxLength(100)
  businessName: string;

  @ApiProperty({
    description: 'Número de RUC único de la empresa',
    example: '20123456789',
    minLength: 11,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'El RUC es obligatorio' })
  @MinLength(11, { message: 'El RUC debe tener al menos 11 dígitos' })
  @MaxLength(20)
  ruc: string;

  @ApiProperty({
    description: 'Dirección fiscal de la empresa',
    example: 'Av. Las Camelias 123, San Isidro',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @MaxLength(255)
  address: string;
}
