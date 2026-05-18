import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { IndustrySegment } from './entities/industry-segment.entity';
import { CreateIndustrySegmentDto } from './dto/create-industry-segment.dto';
import { UpdateIndustrySegmentDto } from './dto/update-industry-segment.dto';
import { QueryIndustrySegmentDto } from './dto/query-industry-segment.dto';

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
    return this.segmentRepo.save(newSegment);
  }

  async findAll(query: QueryIndustrySegmentDto) {
    const { limit = 10, offset = 0, term } = query;

    const whereCondition = term
      ? [{ name: ILike(`%${term}%`) }, { code: ILike(`%${term}%`) }]
      : {}; // Si no hay término, trae todo

    const [items, total] = await this.segmentRepo.findAndCount({
      where: whereCondition,
      take: limit,
      skip: offset,
      order: { isActive: 'DESC', name: 'ASC' }, // Activos primero, luego alfabético
    });

    return {
      data: {
        items,
        total,
        limit,
        offset,
      },
    };
  }

  // Actualizar nombre o código
  async update(id: number, updateDto: UpdateIndustrySegmentDto) {
    const segment = await this.segmentRepo.findOne({ where: { id } });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    Object.assign(segment, updateDto);
    return this.segmentRepo.save(segment);
  }

  // SOFT DELETE (Desactivar) - No borra el registro
  async deactivate(id: number) {
    const segment = await this.segmentRepo.findOne({ where: { id } });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    segment.isActive = false;
    return this.segmentRepo.save(segment);
  }

  // REACTIVAR (En caso el Admin se arrepienta)
  async reactivate(id: number) {
    const segment = await this.segmentRepo.findOne({ where: { id } });
    if (!segment) throw new NotFoundException('Segmento no encontrado');

    segment.isActive = true;
    return this.segmentRepo.save(segment);
  }
}
