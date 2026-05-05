import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/order.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { QueryPurchaseOrderDto } from './dto/query-purchase-order.dto';
import { CommonValidationService } from 'src/common/common-validation.service';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    private readonly commonValidationService: CommonValidationService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createPoDto: CreatePurchaseOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.commonValidationService.findQuoteById(createPoDto.quoteId);
      const newPo = this.poRepository.create(createPoDto);
      const savedPo = await this.poRepository.save(newPo);

      await queryRunner.manager.update(Quote, createPoDto.quoteId, {
        status: QuoteStatus.APROBADO,
        statusReason: `Se ha aprobado y generado la orden de compra con número ${savedPo.poNumber}`,
      });
      await queryRunner.commitTransaction();
      return {
        message: `Se ha aprobado y generado la orden de compra con número ${savedPo.poNumber}`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(queryDto: QueryPurchaseOrderDto) {
    const { limit = 10, offset = 0, term } = queryDto;
    const queryBuilder = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.quote', 'quote');

    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('po.poNumber ILIKE :term', { term: `%${term}%` }).orWhere(
            'quote.quoteNumber ILIKE :term',
            { term: `%${term}%` },
          );
        }),
      );
    }

    const [items, total] = await queryBuilder
      .take(limit)
      .skip(offset)
      .orderBy('po.id', 'DESC')
      .getManyAndCount();

    return { items, total };
  }

  async findOne(id: number) {
    const po = await this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.quote', 'quote')
      .leftJoin('quote.client', 'client')
      .addSelect(['client.id', 'client.commercialName', 'client.ruc'])
      .leftJoin('quote.contact', 'contact')
      .addSelect(['contact.id', 'contact.firstName', 'contact.lastName'])
      .where('po.id = :id', { id })
      .getOne();

    if (!po) {
      throw new NotFoundException(`Orden de Compra con ID ${id} no encontrada`);
    }

    return po;
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
