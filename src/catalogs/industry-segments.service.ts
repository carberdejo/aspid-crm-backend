import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { IndustrySegment } from './entities/industry-segment.entity';
import { CreateIndustrySegmentDto } from './dto/create-industry-segment.dto';
import { UpdateIndustrySegmentDto } from './dto/update-industry-segment.dto';
import { QueryIndustrySegmentDto } from './dto/query-industry-segment.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class IndustrySegmentsService {
  constructor(
    @InjectRepository(IndustrySegment)
    private readonly segmentRepo: Repository<IndustrySegment>,
  ) {}

  // Crear un nuevo segmento
  async create(createDto: CreateIndustrySegmentDto) {
    // Validar que el código no exista (typeorm arroja error, pero es mejor controlarlo)
    const existing = await this.segmentRepo.findOne({
      where: { code: createDto.code },
    });
    if (existing) {
      throw new BadRequestException(
        `El código de segmento ${createDto.code} ya existe.`,
      );
    }

    const newSegment = this.segmentRepo.create(createDto);
    await this.segmentRepo.save(newSegment);
    return { message: `Segmento ${createDto.name} creado exitosamente` };
  }

  async findAll(query: QueryIndustrySegmentDto, currentUser: User) {
    const { limit = 10, offset = 0, term } = query;

    const queryBuilder = this.segmentRepo.createQueryBuilder('segment');

    // 1. FILTRO DE SEGURIDAD (Role-Based Access Control)
    if (currentUser.role !== 'admin') {
      // Obtenemos los segmentos asignados al usuario actual
      const allowedIds = await this.getUserSegmentIds(currentUser.id); // Asegúrate de tener este método

      // Return early: Si no tiene segmentos asignados, la respuesta es vacía
      if (allowedIds.length === 0) {
        return {
          data: { items: [], total: 0, limit: +limit, offset: +offset },
        };
      }

      // Aplicamos el filtro para que solo vea sus segmentos
      queryBuilder.andWhere('segment.id IN (:...allowedIds)', { allowedIds });
    }

    // 2. FILTRO DE BÚSQUEDA (Term)
    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('segment.name ILIKE :term', { term: `%${term}%` }).orWhere(
            'segment.code ILIKE :term',
            { term: `%${term}%` },
          );
        }),
      );
    }

    // 3. EJECUCIÓN (Ordenamiento y Paginación)
    const [items, total] = await queryBuilder
      .orderBy('segment.isActive', 'DESC')
      .addOrderBy('segment.name', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();
    return {
      data: { items, total, limit: +limit, offset: +offset },
    };
  }

  // Actualizar nombre o código
  async update(id: number, updateDto: UpdateIndustrySegmentDto) {
    const segment = await this.segmentRepo.findOne({ where: { id } });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    Object.assign(segment, updateDto);
    await this.segmentRepo.save(segment);
    return { message: `Segmento ${segment.name} actualizado exitosamente` };
  }

  // SOFT DELETE (Desactivar) - No borra el registro
  async deactivate(id: number) {
    const segment = await this.segmentRepo.findOne({ where: { id } });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    segment.isActive = false;
    await this.segmentRepo.save(segment);
    return { message: 'Segmento desactivado exitosamente' };
  }

  // REACTIVAR (En caso el Admin se arrepienta)
  async reactivate(id: number) {
    const segment = await this.segmentRepo.findOne({ where: { id } });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    segment.isActive = true;
    await this.segmentRepo.save(segment);
    return { message: 'Segmento reactivado exitosamente' };
  }

  //===================
  // HELPERS
  //===================
  async getUserSegmentIds(userId: number): Promise<number[]> {
    // Utilizamos QueryBuilder para hacer un join entre segmentos, clientes y usuarios, filtrando por el userId, queryBuilder es más eficiente para este tipo de consultas complejas
    const users = await this.segmentRepo
      .createQueryBuilder('segment')
      .leftJoinAndSelect('segment.clients', 'client')
      .leftJoinAndSelect('client.portfolio', 'portfolio')
      .leftJoin('portfolio.users', 'clientUser')
      .where('clientUser.userId = :userId', { userId })
      .getMany();

    const segmentIds = users.map((segment) => segment.id);
    return segmentIds;
  }
}
