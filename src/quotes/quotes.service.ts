import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { Repository } from 'typeorm';
import { QueryQuoteDto } from './dto/query-quote.dto';
import { CommonValidationService } from 'src/common/common-validation.service';
import { ApiException } from 'src/common/exceptions/api.exception';

@Injectable()
export class QuotesService {
  protected readonly logger = new Logger(QuotesService.name);
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    private readonly commonValidationService: CommonValidationService,
  ) {}
  async create(createQuoteDto: CreateQuoteDto) {
    this.logger.log('Creating new quote...');

    // Validar que el departamento exista
    await this.commonValidationService.findDepartmentById(
      createQuoteDto.departmentId,
    );
    // Validar que el usuario exista
    await this.commonValidationService.findUserById(createQuoteDto.userId);
    // Validar que el cliente exista
    const client = await this.commonValidationService.findClientById(
      createQuoteDto.clientId,
    );
    // Validar que el contacto exista
    const contact = await this.commonValidationService.findContactClientById(
      createQuoteDto.contactId,
    );
    // Validar que el contacto pertenezca al cliente
    if (contact.clientId !== client.id) {
      throw new ApiException(
        400,
        `El contacto con ID ${createQuoteDto.contactId} no pertenece al cliente con ID ${createQuoteDto.clientId}`,
        [],
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Crear y guardar la cotización
      const quote = this.quoteRepository.create(createQuoteDto);
      const savedQuote = await this.quoteRepository.save(quote);

      this.logger.log(`Quote created successfully with ID: ${savedQuote.id}`);
      return {
        message: 'Cotización creada exitosamente',
        data: savedQuote,
      };
    } catch (error) {
      if (error instanceof ApiException) throw error;

      this.logger.error(`Error creating quote: ${error.message}`);
      throw new ApiException(
        500,
        'Error al crear la cotización',
        [error.message],
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  findAll(query: QueryQuoteDto) {
    const { limit = 10, offset = 0 } = query;
    return `This action returns all quotes with limit ${limit} and offset ${offset}`;
  }

  findOne(id: number) {
    return `This action returns a #${id} quote`;
  }

  update(id: number, updateQuoteDto: UpdateQuoteDto) {
    return `This action updates a #${id} quote`;
  }

  // remove(id: number) {
  //   return `This action removes a #${id} quote`;
  // }
}
