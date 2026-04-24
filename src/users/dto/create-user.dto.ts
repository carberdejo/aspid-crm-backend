import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../interfaces/role.interface';

export class CreateUserDto {
  @ApiProperty({
    description: 'Código único de identificación del usuario (Varchar)',
    example: '001',
  })
  @IsString()
  @IsNotEmpty({ message: 'El código de usuario es obligatorio' })
  codUser: string;

  @ApiProperty({
    description: 'Nombres del usuario',
    example: 'Carlos',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  firstName: string;

  @ApiProperty({
    description: 'Apellidos del usuario',
    example: 'Berdejo',
  })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @ApiProperty({
    description: 'Correo electrónico institucional',
    example: 'carlos.berdejo@concar.com',
  })
  @IsString()
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  @IsEmail({}, { message: 'El formato del correo es inválido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña de acceso (mínimo 6 caracteres)',
    example: 'Admin123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Rol asignado en el sistema',
    enum: Role,
    example: Role.ADMIN,
  })
  @IsString()
  @IsIn([Role.ADMIN, Role.USER], {
    message: 'El rol debe ser "admin" o "user"',
  })
  role: string;

  @ApiProperty({
    description: 'País de residencia',
    example: 'Perú',
  })
  @IsString()
  @IsNotEmpty({ message: 'El país es obligatorio' })
  country: string;

  @ApiProperty({
    description: 'Número de teléfono de contacto',
    example: '+51987654321',
  })
  @IsString()
  @IsNotEmpty({ message: 'El número de teléfono es obligatorio' })
  phone: string;

  @ApiProperty({
    description: 'Lista de IDs de departamentos asignados',
    type: [Number],
    example: [1, 2],
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'El usuario debe estar asignado al menos a un departamento',
  })
  @IsNumber({}, { each: true })
  departmentIds: number[];
}
