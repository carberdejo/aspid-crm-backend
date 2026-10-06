import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVisitDto {
  @ApiPropertyOptional({
    description:
      'ID del usuario que realiza la visita. Solo lo considera un admin; para un usuario se toma del token.',
  })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiProperty({ description: 'ID del cliente visitado' })
  @IsNumber()
  @IsNotEmpty()
  clientId: number;

  @ApiProperty({
    description: 'ID del contacto del cliente',
  })
  @IsNumber()
  @IsNotEmpty()
  contactId: number;

  @ApiProperty({
    description: 'Fecha de la visita (formato ISO8601)',
    example: '2024-03-15',
  })
  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ description: 'Temas tratados durante la visita' })
  @IsString()
  @IsNotEmpty()
  visitTopics: string;

  @ApiProperty({ description: 'Resumen de los resultados de la visita' })
  @IsString()
  @IsNotEmpty()
  outcomeSummary: string;

  @ApiProperty({ description: 'ID del departamento asociado a la visita' })
  @IsNumber()
  @IsNotEmpty()
  departmentId: number;
}
