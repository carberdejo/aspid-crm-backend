import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsNumber } from 'class-validator';

export class CreateContactClientDto {
  @ApiProperty({
    description: 'Nombre del representante del cliente',
    example: 'Juan',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del contacto es obligatorio' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Apellido del representante del cliente',
    example: 'Pérez',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El apellido del contacto es obligatorio' })
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Cargo o posición en la empresa',
    example: 'Gerente de Compras',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El cargo/posición es obligatorio' })
  @MaxLength(100)
  position: string;

  @ApiProperty({
    description: 'Número de teléfono o celular de contacto',
    example: '987654321',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono del contacto es obligatorio' })
  @MaxLength(20)
  phone: string;

  @ApiProperty({
    description: 'Código de país para el número de teléfono',
    example: '51',
  })
  @IsString()
  @IsNotEmpty({ message: 'El código de país es obligatorio' })
  @MaxLength(5, {
    message: 'El código de país no puede tener más de 5 caracteres',
  })
  countryCode: string;

  @ApiProperty({
    description: 'ID del cliente al que pertenece este contacto',
    example: 1,
    // required: false,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El ID del cliente es obligatorio' })
  // @IsOptional()
  clientId: number;

  @ApiProperty({
    description: 'Correo electrónico del contacto',
    example: 'juan.perez@empresa.com',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El correo electrónico del contacto es obligatorio' })
  @MaxLength(100)
  email: string;
}
