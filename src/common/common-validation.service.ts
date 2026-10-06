// src/common/services/common-validation.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client, ContactClient } from 'src/clients/entities';
import { Department } from 'src/departments/entities/department.entity';
import { PurchaseOrder } from 'src/orders/entities/order.entity';
import { Quote } from 'src/quotes/entities/quote.entity';
import { QuoteNotFoundException } from 'src/quotes/exceptions/quote.exceptions';
import { QuoteStatus } from 'src/quotes/interfaces/quote-status.enum';
import { User } from 'src/users/entities';
import { Repository } from 'typeorm';

@Injectable()
export class CommonValidationService {
  protected readonly logger = new Logger(CommonValidationService.name);
  constructor(
    @InjectRepository(Client) private clientRepository: Repository<Client>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(ContactClient)
    private contactRepository: Repository<ContactClient>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
  ) {}

  //? Método específico para validar que un usuario exista antes de asignarlo a una OC o una Cotización
  async findUserById(id: number) {
    // Validar que el usuario exista
    const user = await this.userRepository.findOne({
      where: { id: id },
    });
    if (!user) {
      this.logger.log(`Usuario con userId ${id} no encontrado`);
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    this.logger.log(
      `Usuario ${user.firstName} ${user.lastName} con userId ${user.id} encontrado`,
    );
    return user;
  }

  //? Método específico para validar que un cliente exista antes de asignarlo a una OC o una Cotización
  async findClientById(id: number) {
    // Validar que el cliente exista
    const client = await this.clientRepository.findOne({
      where: { id: id },
    });
    if (!client) {
      this.logger.log(`Cliente con clientId ${id} no encontrado`);
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    this.logger.log(
      `Cliente ${client.commercialName}  con clientId ${client.id} encontrado`,
    );
    return client;
  }

  //? Método específico para validar que un contacto de cliente exista antes de asignarlo a una OC o una Cotización
  async findContactClientById(id: number) {
    // Validar que el cliente exista
    const contact = await this.contactRepository.findOne({
      where: { id: id },
    });
    if (!contact) {
      this.logger.log(`Contacto con contactId ${id} no encontrado`);
      throw new NotFoundException(`Contacto con ID ${id} no encontrado`);
    }
    this.logger.log(
      `Contacto ${contact.firstName} ${contact.lastName}  con contactId ${contact.id} encontrado`,
    );
    return contact;
  }

  //? Método específico para validar que un departamento exista antes de asignarlo a una OC o una Cotización
  async findDepartmentById(id: number) {
    // Validar que el departamento exista
    const department = await this.departmentRepository.findOne({
      where: { id: id },
    });
    if (!department) {
      throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
    }
    this.logger.log(
      `Departamento ${department.name}  con departmentId ${department.id} encontrado`,
    );
    return department;
  }

  //? Método específico para validar que una cotización exista antes de crear una OC o una Factura
  async findQuoteById(id: number) {
    // Validar que la cotización exista
    const quote = await this.quoteRepository.findOne({
      where: { id: id },
    });
    if (!quote) throw new QuoteNotFoundException(id);

    this.logger.log(
      `Cotización ${quote.quoteNumber}  con quoteId ${quote.id} encontrada`,
    );
    return quote;
  }

  //? Metodo específico para validar que la cotización no esté aprobada antes de crear una OC o una Factura
  async validateQuoteAprobed(quoteId: number) {
    const quote = await this.findQuoteById(quoteId);
    if ((quote.status as QuoteStatus) === QuoteStatus.APROBADO) {
      this.logger.log(
        `La cotización con ID ${quoteId} ya está aprobada. Estado actual: ${quote.status}`,
      );
      throw new BadRequestException(
        `La cotización con ID ${quoteId} ya está aprobada. Estado actual: ${quote.status}`,
      );
    }
    // Devolvemos la cotización para que el llamador valide permisos sin otra consulta
    return quote;
  }

  async validatePurchaseOrder(orderId: number) {
    const existingPO = await this.purchaseOrderRepository.findOne({
      where: { id: orderId },
      relations: ['quote'],
    });
    if (!existingPO) {
      throw new BadRequestException(
        `No existe una Orden de Compra CON ID: ${orderId}`,
      );
    }
    return existingPO;
  }
}
