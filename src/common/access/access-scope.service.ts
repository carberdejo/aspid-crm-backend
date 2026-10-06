import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { User, UserDepartment } from 'src/users/entities';
import { Role } from 'src/users/interfaces';
import {
  DepartmentAccessDeniedException,
  ResourceOwnershipException,
  TargetUserNotInDepartmentException,
} from './access.exceptions';

/** Registro de actividad con dueño y área (visita, cotización, entrega...) */
export interface OwnedResource {
  id: number;
  userId: number;
  departmentId?: number | null;
}

export interface ScopeOptions {
  /** Columna del dueño dentro del alias (por defecto 'userId') */
  userField?: string;
  /** Columna del área dentro del alias (por defecto 'departmentId') */
  departmentField?: string;
  /** Columnas adicionales que dan acceso de lectura (p. ej. 'collaboratorId') */
  readerFields?: string[];
}

/**
 * Reglas de alcance por empleado y área.
 *
 * - admin: sin restricciones.
 * - user: solo sus registros y solo en las áreas que tiene asignadas.
 *
 * Las áreas del usuario se leen de `currentUser.userDepartments`, que JwtStrategy
 * carga desde la base de datos en cada request (no del JWT, que puede estar desactualizado).
 *
 * Nota: los ids bigint llegan como string desde Postgres, por eso se normalizan con Number().
 */
@Injectable()
export class AccessScopeService {
  constructor(
    @InjectRepository(UserDepartment)
    private readonly userDepartmentRepository: Repository<UserDepartment>,
  ) {}

  isAdmin(currentUser: User): boolean {
    return (currentUser.role as Role) === Role.ADMIN;
  }

  /** IDs de las áreas asignadas al usuario autenticado */
  getDepartmentIds(currentUser: User): number[] {
    return (currentUser.userDepartments ?? [])
      .filter((ud) => ud.department)
      .map((ud) => Number(ud.department.id));
  }

  /** Lanza 403 si el usuario no pertenece al área. Aplica también al admin. */
  assertDepartmentAccess(currentUser: User, departmentId: number): void {
    if (!this.getDepartmentIds(currentUser).includes(Number(departmentId)))
      throw new DepartmentAccessDeniedException(departmentId);
  }

  /**
   * Determina el dueño efectivo de una actividad nueva y valida el área.
   *
   * - user: siempre él mismo (se ignora el userId enviado) y debe pertenecer al área.
   * - admin: puede indicar otro usuario, que debe estar activo y pertenecer al área.
   *   Si no indica ninguno, se registra a su nombre con la misma validación.
   */
  async resolveOwner(
    currentUser: User,
    departmentId: number,
    requestedUserId?: number,
  ): Promise<number> {
    const currentUserId = Number(currentUser.id);

    if (
      !this.isAdmin(currentUser) ||
      requestedUserId === undefined ||
      Number(requestedUserId) === currentUserId
    ) {
      this.assertDepartmentAccess(currentUser, departmentId);
      return currentUserId;
    }

    const ownerId = Number(requestedUserId);
    const membership = await this.userDepartmentRepository
      .createQueryBuilder('ud')
      .innerJoin('ud.user', 'user')
      .innerJoin('ud.department', 'department')
      .where('user.id = :ownerId', { ownerId })
      .andWhere('department.id = :departmentId', { departmentId })
      .andWhere('user.isActive = true')
      .getExists();

    if (!membership)
      throw new TargetUserNotInDepartmentException(ownerId, departmentId);

    return ownerId;
  }

  /**
   * Restringe un listado al alcance del usuario. No hace nada si es admin.
   * Para un user: (dueño OR lector) AND área ∈ sus áreas.
   */
  applyScope<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    alias: string,
    currentUser: User,
    options: ScopeOptions = {},
  ): SelectQueryBuilder<T> {
    if (this.isAdmin(currentUser)) return queryBuilder;

    const {
      userField = 'userId',
      departmentField = 'departmentId',
      readerFields = [],
    } = options;
    const departmentIds = this.getDepartmentIds(currentUser);

    // Sin áreas asignadas no hay nada que pueda ver
    if (departmentIds.length === 0) return queryBuilder.andWhere('1 = 0');

    const ownerCondition = [userField, ...readerFields]
      .map((field) => `${alias}.${field} = :scopeUserId`)
      .join(' OR ');

    return queryBuilder
      .andWhere(`(${ownerCondition})`, { scopeUserId: Number(currentUser.id) })
      .andWhere(`${alias}.${departmentField} IN (:...scopeDepartmentIds)`, {
        scopeDepartmentIds: departmentIds,
      });
  }

  /**
   * Lanza 403 si el usuario no puede leer el registro.
   * Pueden leer: admin, el dueño y los lectores indicados (p. ej. el colaborador),
   * siempre que el registro esté en una de sus áreas.
   */
  assertCanRead(
    resource: OwnedResource,
    currentUser: User,
    resourceLabel: string,
    readerIds: (number | null | undefined)[] = [],
  ): void {
    if (this.isAdmin(currentUser)) return;

    const currentUserId = Number(currentUser.id);
    const allowed = [resource.userId, ...readerIds]
      .filter((id) => id !== null && id !== undefined)
      .map(Number);

    if (
      !allowed.includes(currentUserId) ||
      !this.isInUserDepartments(resource, currentUser)
    )
      throw new ResourceOwnershipException(resourceLabel, resource.id);
  }

  /**
   * Lanza 403 si el usuario no puede modificar el registro.
   * Solo el admin o el dueño, y el registro debe estar en una de sus áreas.
   */
  assertCanModify(
    resource: OwnedResource,
    currentUser: User,
    resourceLabel: string,
  ): void {
    this.assertCanRead(resource, currentUser, resourceLabel);
  }

  private isInUserDepartments(
    resource: OwnedResource,
    currentUser: User,
  ): boolean {
    // Registros sin área (p. ej. entregas antiguas) solo dependen del dueño
    if (resource.departmentId === null || resource.departmentId === undefined)
      return true;
    return this.getDepartmentIds(currentUser).includes(
      Number(resource.departmentId),
    );
  }
}
