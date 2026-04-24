// src/common/services/common-validation.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client, ContactClient } from 'src/clients/entities';
import { Department } from 'src/departments/entities/department.entity';
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
  ) {}

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

  async findDepartmentById(id: number) {
    // Validar que el departamento exista
    const department = await this.departmentRepository.findOne({
      where: { id: id },
    });
    if (!department) {
      this.logger.log(`Departamento con departmentId ${id} no encontrado`);
      throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
    }
    this.logger.log(
      `Departamento ${department.name}  con departmentId ${department.id} encontrado`,
    );
    return department;
  }
}
