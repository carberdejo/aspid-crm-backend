import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserClientException } from './entities/user-client-exception.entity';
import { CreateUserClientExceptionDto } from './dto/create-user-client-exception.dto';
import { UpdateUserClientExceptionDto } from './dto/update-user-client-exception.dto';
import { CommonValidationService } from 'src/common/common-validation.service';

@Injectable()
export class UserClientExceptionsService {
  constructor(
    @InjectRepository(UserClientException)
    private readonly exceptionRepo: Repository<UserClientException>,
    private readonly validationService: CommonValidationService,
  ) {}

  async create(
    createDto: CreateUserClientExceptionDto,
  ): Promise<UserClientException> {
    await this.validationService.findUserById(createDto.userId);
    await this.validationService.findClientById(createDto.clientId);
    // 1. Buscamos si ya existe un registro histórico para este usuario y cliente
    const existingException = await this.exceptionRepo.findOne({
      where: {
        userId: createDto.userId,
        clientId: createDto.clientId,
      },
    });

    if (existingException) {
      if (existingException.isActive) {
        throw new ConflictException(
          'El usuario ya tiene acceso activo a este cliente.',
        );
      }

      // 2. Reactivación: Si existía pero estaba apagado, lo volvemos a encender
      existingException.isActive = true;
      existingException.revokedAt = undefined as unknown as Date; // Limpiamos la fecha de revocación
      existingException.grantedAt = new Date();
      //   const clientExceptions = await this.exceptionRepo.create(createDto);

      if (createDto.notes) {
        existingException.notes = createDto.notes;
      }

      return await this.exceptionRepo.save(existingException);
    }

    // 3. Si es la primera vez en la historia que se le da este acceso, lo creamos
    const newException = this.exceptionRepo.create(createDto);

    return await this.exceptionRepo.save(newException);
  }

  /**
   * Lista todas las excepciones (activas e inactivas) de un usuario específico.
   * Ideal para el panel de administración donde ves el perfil del usuario.
   */
  async findAllByUserId(userId: number): Promise<UserClientException[]> {
    return await this.exceptionRepo.find({
      where: { userId },
      //   relations: ['client', 'grantedBy'], // Traemos los datos del cliente y de quién le dio el permiso
      order: {
        isActive: 'DESC', // Los activos primero
        grantedAt: 'DESC', // Los más recientes primero
      },
    });
  }

  /**
   * Actualiza una excepción (Principalmente usado para Revocar el acceso)
   */
  async update(
    id: number,
    updateDto: UpdateUserClientExceptionDto,
  ): Promise<UserClientException> {
    const exception = await this.exceptionRepo.findOneBy({ id });

    if (!exception) {
      throw new NotFoundException(
        `El registro de excepción con ID ${id} no existe.`,
      );
    }

    // Lógica de Auditoría: Sellar fecha de revocación automáticamente
    if (updateDto.isActive === false && exception.isActive === true) {
      exception.revokedAt = new Date();
    } else if (updateDto.isActive === true && exception.isActive === false) {
      // Por si el frontend envía un update forzando el isActive a true directamente
      exception.revokedAt = undefined as unknown as Date;
    }

    Object.assign(exception, updateDto);
    return await this.exceptionRepo.save(exception);
  }

  /**
   * Acción directa para revocar acceso sin necesidad de pasar un DTO completo.
   * Útil si en el frontend solo pones un botón de "Eliminar/Revocar".
   */
  async revokeAccess(id: number): Promise<UserClientException> {
    return this.update(id, { isActive: false });
  }
}
