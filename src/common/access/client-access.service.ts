import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';
import { PortfolioUser } from 'src/portfolios/entities/portfolio-user.entity';
import { UserClientException } from 'src/clients/entities/user-client-exception.entity';
import {
  ClientAccessDeniedException,
  PortfolioNotAssignedException,
} from './access.exceptions';

/** Lo mínimo de un usuario para decidir el acceso */
export type UserRef = Pick<User, 'id' | 'role'>;

/** Lo mínimo de un cliente para decidir el acceso */
export interface ClientRef {
  id: number;
  portfolioId?: number | null;
}

/**
 * Reglas de acceso a clientes.
 *
 * - admin: todos los clientes.
 * - user: los clientes de sus carteras (portfolio_users) más aquellos para los que
 *   tiene una excepción de acceso activa (user_client_exception).
 *
 * Nota: los ids bigint llegan como string desde Postgres, por eso se normalizan con Number().
 */
@Injectable()
export class ClientAccessService {
  constructor(
    @InjectRepository(PortfolioUser)
    private readonly portfolioUserRepository: Repository<PortfolioUser>,
    @InjectRepository(UserClientException)
    private readonly clientExceptionRepository: Repository<UserClientException>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private isAdmin(currentUser: UserRef): boolean {
    return (currentUser.role as Role) === Role.ADMIN;
  }

  /** IDs de las carteras asignadas al usuario */
  async getPortfolioIds(currentUser: UserRef): Promise<number[]> {
    const assignments = await this.portfolioUserRepository.find({
      where: { userId: currentUser.id },
    });
    return assignments.map((a) => Number(a.portfolioId));
  }

  /**
   * Restringe un listado de clientes al alcance del usuario. No hace nada si es admin.
   * Usa subconsultas: no hace falta cargar antes las carteras ni las excepciones.
   */
  applyClientScope<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    alias: string,
    currentUser: User,
  ): SelectQueryBuilder<T> {
    if (this.isAdmin(currentUser)) return queryBuilder;

    const portfoliosQuery = queryBuilder
      .subQuery()
      .select('scopePortfolio.portfolioId')
      .from(PortfolioUser, 'scopePortfolio')
      .where('scopePortfolio.userId = :scopeClientUserId')
      .getQuery();

    const exceptionsQuery = queryBuilder
      .subQuery()
      .select('scopeException.clientId')
      .from(UserClientException, 'scopeException')
      .where('scopeException.userId = :scopeClientUserId')
      .andWhere('scopeException.isActive = true')
      .getQuery();

    return queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where(`${alias}.portfolioId IN ${portfoliosQuery}`).orWhere(
          `${alias}.id IN ${exceptionsQuery}`,
        );
      }),
      { scopeClientUserId: Number(currentUser.id) },
    );
  }

  /** true si el usuario puede ver y usar el cliente */
  async canAccessClient(
    currentUser: UserRef,
    client: ClientRef,
  ): Promise<boolean> {
    if (this.isAdmin(currentUser)) return true;

    if (client.portfolioId !== null && client.portfolioId !== undefined) {
      const portfolioIds = await this.getPortfolioIds(currentUser);
      if (portfolioIds.includes(Number(client.portfolioId))) return true;
    }

    return this.clientExceptionRepository.exists({
      where: {
        userId: currentUser.id,
        clientId: client.id,
        isActive: true,
      },
    });
  }

  /** Lanza 403 si el usuario no puede ver ni usar el cliente */
  async assertCanAccessClient(
    currentUser: User,
    client: ClientRef,
  ): Promise<void> {
    if (!(await this.canAccessClient(currentUser, client)))
      throw new ClientAccessDeniedException(client.id);
  }

  /**
   * Valida el cliente contra el dueño efectivo de un registro (visita, cotización, entrega).
   *
   * - Si el dueño es quien hace la petición, equivale a assertCanAccessClient.
   * - Si un admin registra a nombre de otro usuario, se valida el acceso de ese usuario:
   *   no puede asignarle un cliente fuera de sus carteras o excepciones activas.
   */
  async assertOwnerCanAccessClient(
    currentUser: User,
    ownerId: number,
    client: ClientRef,
  ): Promise<void> {
    if (Number(ownerId) === Number(currentUser.id))
      return this.assertCanAccessClient(currentUser, client);

    // resolveOwner ya validó que el dueño existe y está activo; aquí solo falta su rol
    const owner = await this.userRepository.findOne({
      where: { id: ownerId },
      select: { id: true, role: true },
    });
    if (!owner || !(await this.canAccessClient(owner, client)))
      throw new ClientAccessDeniedException(client.id);
  }

  /** Lanza 403 si el usuario no está asignado a la cartera. El admin pasa siempre. */
  async assertPortfolioAssigned(
    currentUser: User,
    portfolioId: number,
  ): Promise<void> {
    if (this.isAdmin(currentUser)) return;

    const portfolioIds = await this.getPortfolioIds(currentUser);
    if (!portfolioIds.includes(Number(portfolioId)))
      throw new PortfolioNotAssignedException(portfolioId);
  }
}
