import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { QueryQuoteDto } from './dto/query-quote.dto';
import { CommonValidationService } from 'src/common/common-validation.service';
import { ApiException } from 'src/common/exceptions/api.exception';
import { QuoteMapper } from './mappers/quote.mapper';
import { RemoveQuoteDto } from './dto/remove-quote.dto';
import { QuoteStatus } from './interfaces/quote-status.enum';
import {
  QuoteInvalidStatusTransitionException,
  QuoteNotFoundException,
} from './exceptions/quote.exceptions';
import { ExchangeRateService } from 'src/common/exchange-rate.service';
import { AccessScopeService } from 'src/common/access/access-scope.service';
import { ClientAccessService } from 'src/common/access/client-access.service';
import { User } from 'src/users/entities';

const RESOURCE_LABEL = 'la cotización';

@Injectable()
export class QuotesService {
  protected readonly logger = new Logger(QuotesService.name);
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    private readonly commonValidationService: CommonValidationService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly accessScopeService: AccessScopeService,
    private readonly clientAccessService: ClientAccessService,
  ) {}
  async create(createQuoteDto: CreateQuoteDto, currentUser: User) {
    this.logger.log('Creating new quote...');

    // Dueño efectivo: el del token para un user; el indicado (validado) para un admin.
    // También valida que el área exista y que el dueño pertenezca a ella.
    const userId = await this.accessScopeService.resolveOwner(
      currentUser,
      createQuoteDto.departmentId,
      createQuoteDto.userId,
    );
    // Validar que el cliente exista y que el usuario tenga acceso a él
    const client = await this.commonValidationService.findClientById(
      createQuoteDto.clientId,
    );
    await this.clientAccessService.assertCanAccessClient(currentUser, client);
    // Validar que el contacto exista
    const contact = await this.commonValidationService.findContactClientById(
      createQuoteDto.contactId,
    );
    // Validar que el contacto pertenezca al cliente
    if (Number(contact.clientId) !== Number(client.id)) {
      throw new ApiException(
        400,
        `El contacto con ID ${createQuoteDto.contactId} no pertenece al cliente con ID ${createQuoteDto.clientId}`,
        [],
        HttpStatus.BAD_REQUEST,
      );
    }
    // Crear y guardar la cotización
    const quote = this.quoteRepository.create({ ...createQuoteDto, userId });
    const savedQuote = await this.quoteRepository.save(quote);

    this.logger.log(
      `Cotizacion creada con número: ${savedQuote.quoteNumber} a las ${savedQuote.createdAt.toDateString()} por el usuario ID: ${savedQuote.userId}`,
    );
    // throw new Error('Simulación de error para probar el filtro'); // Simulamos un error para probar el filtro global
    return {
      message: `Cotización con número: ${savedQuote.quoteNumber} creada exitosamente`,
      // data: savedQuote,
    };
  }

  async findAll(queryQuoteDto: QueryQuoteDto, currentUser: User) {
    const {
      limit = 10,
      offset = 0,
      term,
      clientId,
      userId,
      departmentId,
      status,
      startDate,
      endDate,
    } = queryQuoteDto;

    this.logger.log('Fetching quotes with filters...');

    const queryBuilder: SelectQueryBuilder<Quote> = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.user', 'user') // Usuario que creó la cotización
      .leftJoin('quote.client', 'client')
      .addSelect(['client.id', 'client.commercialName', 'client.ruc'])
      .leftJoin('quote.contact', 'contact')
      .addSelect([
        'contact.id',
        'contact.firstName',
        'contact.lastName',
        'contact.position',
      ])
      .leftJoinAndSelect('quote.collaborator', 'collaborator'); // Colaborador asignado

    // Alcance obligatorio: un user ve las cotizaciones propias o donde es colaborador,
    // solo en sus áreas (admin ve todo). Se aplica antes del clone para que el
    // total en USD tampoco incluya cotizaciones ajenas.
    this.accessScopeService.applyScope(queryBuilder, 'quote', currentUser, {
      readerFields: ['collaboratorId'],
    });

    // --- FILTROS ESPECÍFICOS DE QUOTE ---

    // 1. BUSCADOR GLOBAL (term) - Unifica varios campos
    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('quote.quoteNumber ILIKE :term', { term: `%${term}%` })
            .orWhere('client.commercialName ILIKE :term', { term: `%${term}%` })
            .orWhere('contact.firstName ILIKE :term', { term: `%${term}%` })
            .orWhere('contact.lastName ILIKE :term', { term: `%${term}%` })
            .orWhere('quote.description ILIKE :term', { term: `%${term}%` });
        }),
      );
    }

    if (clientId)
      queryBuilder.andWhere('quote.clientId = :clientId', { clientId });

    if (userId) queryBuilder.andWhere('quote.userId = :userId', { userId });

    if (departmentId)
      queryBuilder.andWhere('quote.departmentId = :departmentId', {
        departmentId,
      });

    if (status) queryBuilder.andWhere('quote.status = :status', { status });

    if (queryQuoteDto.type) {
      queryBuilder.andWhere('quote.type = :type', {
        type: queryQuoteDto.type,
      });
    }

    // --- FILTROS HEREDADOS (PAGINATION / DATES) ---

    if (startDate)
      queryBuilder.andWhere('quote.createdAt >= :startDate', { startDate });

    if (endDate)
      queryBuilder.andWhere('quote.createdAt <= :endDate', { endDate });

    const sumQueryBuilder = queryBuilder.clone();

    if (!status) {
      sumQueryBuilder.andWhere('quote.status != :rejectedStatus', {
        rejectedStatus: QuoteStatus.RECHAZADO, // Asegúrate de usar el valor exacto de tu enum
      });
    }

    const totalsByCurrency = await sumQueryBuilder
      .select('quote.currency', 'currency')
      .addSelect('SUM(quote.amount)', 'sum')
      .groupBy('quote.currency')
      .getRawMany();

    // Cargamos tus tasas de cambio en 0 milisegundos desde la caché in-memory que creamos
    const todayRates = await this.exchangeRateService.getRates();
    let totalAmountUSD = 0;

    totalsByCurrency.forEach((bucket: { currency: string; sum: string }) => {
      const currency = bucket.currency || 'USD';
      const sumAmount = parseFloat(bucket.sum || '0');
      const rate = todayRates[currency] || 1;

      if (currency === 'USD') {
        totalAmountUSD += sumAmount;
      } else {
        totalAmountUSD += sumAmount / rate;
      }
    });

    // Ordenar por fecha de creación descendente
    const [quotes, total] = await queryBuilder
      .orderBy('quote.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return {
      data: {
        items: quotes.map((quote) => QuoteMapper.toResponse(quote, false)),
        total,
        limit,
        offset,
        totalAmountUSD: parseFloat(totalAmountUSD.toFixed(2)),
      },
    };
  }

  async findOne(id: number, currentUser: User) {
    this.logger.log(`Fetching quote with ID: ${id}`);

    const quote = await this.findOneInternal(id);

    if (!quote) throw new QuoteNotFoundException(id);

    // El colaborador puede ver la cotización (solo lectura)
    this.accessScopeService.assertCanRead(quote, currentUser, RESOURCE_LABEL, [
      quote.collaboratorId,
    ]);

    // --- USAMOS EL MAPPER QUE CREAMOS ANTES ---
    const optimizedQuote = QuoteMapper.toResponse(quote, true);

    this.logger.log(`Quote retrieved successfully`);
    return optimizedQuote;
  }

  async update(id: number, updateQuoteDto: UpdateQuoteDto, currentUser: User) {
    this.logger.log(`Updating quote with ID: ${id}`);
    // 1. Verificar que la cotización existe
    const quote = await this.quoteRepository.findOneBy({ id });
    if (!quote) {
      throw new QuoteNotFoundException(id);
    }

    // Solo el dueño o un admin pueden editar (el colaborador no)
    this.accessScopeService.assertCanModify(quote, currentUser, RESOURCE_LABEL);

    // Si la edición cambia el dueño o el área, se revalidan con las mismas reglas que al crear
    const ownerId = await this.accessScopeService.resolveOwnerOnUpdate(
      currentUser,
      quote,
      updateQuoteDto,
    );
    const changes: UpdateQuoteDto =
      ownerId === undefined
        ? updateQuoteDto
        : { ...updateQuoteDto, userId: ownerId };

    // 2. Validaciones de integridad si se envían IDs nuevos
    if (updateQuoteDto.clientId) {
      const client = await this.commonValidationService.findClientById(
        updateQuoteDto.clientId,
      );
      await this.clientAccessService.assertCanAccessClient(currentUser, client);
    }
    if (updateQuoteDto.contactId) {
      const contact = await this.commonValidationService.findContactClientById(
        updateQuoteDto.contactId,
      );
      // Validar que el contacto pertenezca al cliente (el nuevo o el que ya tenía)
      const cid = updateQuoteDto.clientId || quote.clientId;
      if (Number(contact.clientId) !== Number(cid)) {
        throw new ApiException(
          400,
          'El contacto no pertenece al cliente',
          [],
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 3. Ejecutar la actualización con MERGE
    // merge "pisa" los valores de 'quote' con los de 'updateQuoteDto'
    const updatedEntity = this.quoteRepository.merge(quote, changes);

    // Guardamos la entidad mezclada
    await this.quoteRepository.save(updatedEntity);

    // 4. Recargar relaciones para el Mapper (importante para traer nombres de user, client, etc.)
    const fullQuote = await this.findOneInternal(id);

    if (!fullQuote) throw new QuoteNotFoundException(id); // Esto es raro que pase pero lo ponemos por seguridad

    this.logger.log(`Quote ${id} updated successfully`);

    return {
      message: 'Cotización actualizada exitosamente',
      data: QuoteMapper.toResponse(fullQuote, true), // Devolvemos el detalle actualizado
    };
  }

  async remove(id: number, removeQuoteDto: RemoveQuoteDto, currentUser: User) {
    this.logger.log(`Soft-deleting quote with ID: ${id}`);

    // 1. Buscamos la cotización
    const quote = await this.quoteRepository.findOneBy({ id: Number(id) });

    if (!quote) throw new QuoteNotFoundException(id);

    // Solo el dueño o un admin pueden rechazarla
    this.accessScopeService.assertCanModify(quote, currentUser, RESOURCE_LABEL);

    // 2. Validar si ya está rechazada para no repetir el proceso
    if ((quote.status as QuoteStatus) === QuoteStatus.RECHAZADO) {
      throw new QuoteInvalidStatusTransitionException(
        quote.status,
        QuoteStatus.RECHAZADO,
      );
    }

    // 3. Aplicar borrado lógico mediante cambio de estado
    const updatedQuote = this.quoteRepository.merge(quote, {
      status: QuoteStatus.RECHAZADO,
      statusReason: removeQuoteDto.statusReason,
    });

    await this.quoteRepository.save(updatedQuote);

    this.logger.log(`Quote ${id} marked as RECHAZADO`);

    return {
      message: ` La cotización con codigo ${quote.quoteNumber} ha sido rechazada exitosamente`,
    };
  }

  // Método privado auxiliar para recargar la entidad con sus relaciones
  private async findOneInternal(id: number) {
    return await this.quoteRepository.findOne({
      where: { id },
      relations: ['user', 'client', 'contact', 'collaborator'],
    });
  }
}
