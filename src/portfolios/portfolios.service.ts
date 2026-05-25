import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, DataSource, Brackets } from 'typeorm';
import { Portfolio } from './entities/portfolio.entity';
import { PortfolioUser } from './entities/portfolio-user.entity';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { CommonValidationService } from 'src/common/common-validation.service';
import { QueryPortfolioDto } from './dto/query-portfolio.dto';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepo: Repository<Portfolio>,
    @InjectRepository(PortfolioUser)
    private readonly portfolioUserRepo: Repository<PortfolioUser>,
    private readonly validationService: CommonValidationService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreatePortfolioDto) {
    const existing = await this.portfolioRepo.findOne({
      where: { code: createDto.code },
    });
    if (existing)
      throw new BadRequestException(`La cartera ${createDto.code} ya existe.`);

    await this.validateUsers(createDto.users?.map((u) => u.userId) || []);
    // TypeORM mapeará automáticamente el array 'users' a la relación gracias al cascade
    const newPortfolio = this.portfolioRepo.create(createDto);

    // Guarda cabecera y detalle en una sola transacción atómica
    await this.portfolioRepo.save(newPortfolio);
    return { message: `Cartera ${createDto.code} creada exitosamente` };
  }

  // FIND ALL UNIFICADO CON BÚSQUEDA Y PAGINACIÓN
  async findAll(paginationDto: QueryPortfolioDto, currentUser: User) {
    console.log({ currentUser });
    const { limit = 10, offset = 0, term } = paginationDto;
    const queryBuilder = this.portfolioRepo
      .createQueryBuilder('portfolio')
      // Mantenemos las relaciones que ya tenías
      .leftJoin('portfolio.users', 'portfolioUser')
      .leftJoin('portfolioUser.user', 'user')
      .select([
        'portfolio.id',
        'portfolio.code',
        'portfolio.type',
        'portfolio.province',
        'portfolio.zone',
        'portfolio.isActive',
        'portfolioUser.id',
        'portfolioUser.roleInPortfolio',
        'user.id',
        'user.codUser',
        'user.firstName',
        'user.lastName',
      ]);

    if ((currentUser.role as Role) !== Role.ADMIN) {
      // Si el usuario no es admin, filtramos las carteras para mostrar solo las que le corresponden
      const userPortfolios = await this.findByUser(currentUser.id);
      const allowedIds = userPortfolios.map((up) => up.portfolioId);
      if (allowedIds.length === 0) {
        return {
          data: {
            items: [],
            total: 0,
            limit,
            offset,
          },
        };
      }
      queryBuilder.andWhere('portfolio.id IN (:...allowedIds)', { allowedIds });
    }

    if (term) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('portfolio.code ILIKE :term', { term: `%${term}%` })
            .orWhere('portfolio.type ILIKE :term', { term: `%${term}%` })
            .orWhere('portfolio.zone ILIKE :term', { term: `%${term}%` })
            .orWhere('portfolio.province ILIKE :term', { term: `%${term}%` });
        }),
      );
    }

    // 3. ORDENAMIENTO Y PAGINACIÓN
    const [items, total] = await queryBuilder
      .orderBy('portfolio.isActive', 'DESC')
      .addOrderBy('portfolio.code', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: {
        items,
        total,
        limit,
        offset,
      },
    };
  }

  async findOne(id: number) {
    const portfolio = await this.portfolioRepo.findOne({
      where: { id },
      relations: ['users', 'users.user'], // Trae los usuarios asignados y sus datos básicos
      select: {
        id: true,
        code: true,
        type: true,
        province: true,
        zone: true,
        isActive: true,
        users: {
          id: true,
          roleInPortfolio: true,
          user: {
            id: true,
            codUser: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    if (!portfolio) throw new NotFoundException('Cartera no encontrada');
    return portfolio;
  }

  async update(id: number, updateDto: UpdatePortfolioDto) {
    const { users, ...portfolioData } = updateDto;

    const portfolio = await this.portfolioRepo.findOne({ where: { id } });
    if (!portfolio) throw new NotFoundException('Cartera no encontrada');

    await this.validateUsers(users?.map((u) => u.userId) || []);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 3. Actualizar datos de cabecera (code, type, zone, province)
      Object.assign(portfolio, portfolioData);
      await queryRunner.manager.save(Portfolio, portfolio);

      // 4. Si el formulario envió el array de usuarios, sincronizamos la tabla intermedia
      if (users) {
        // A. Borramos todos los usuarios actuales de esta cartera
        await queryRunner.manager.delete(PortfolioUser, { portfolioId: id });

        // B. Mapeamos e insertamos el nuevo set de usuarios asignados
        if (users.length > 0) {
          const newUsersArr = users.map((u) => {
            const userAssignment = new PortfolioUser();
            userAssignment.portfolioId = id;
            userAssignment.userId = u.userId;
            userAssignment.roleInPortfolio = u.roleInPortfolio;
            return userAssignment;
          });

          await queryRunner.manager.save(PortfolioUser, newUsersArr);
        }
      }

      // 5. Si todo salió bien, guardamos los cambios en la BD real
      await queryRunner.commitTransaction();

      // Devolvemos la cartera actualizada llamando a tu lógica de mapeo limpio
      // return this.findOneClean(id);
      return { message: `Cartera ${portfolio.code} actualizada exitosamente` };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        'Error al actualizar la cartera y sus usuarios: ' + error?.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async deactivate(id: number) {
    const portfolio = await this.portfolioRepo.findOne({ where: { id } });
    if (!portfolio) throw new NotFoundException('Cartera no encontrada');
    if (!portfolio.isActive)
      throw new BadRequestException('La cartera ya está desactivada');

    portfolio.isActive = false;
    await this.portfolioRepo.save(portfolio);
    return { message: 'Cartera desactivada exitosamente' };
  }

  // =======================================================
  // LOGICA PARA ASIGNACIÓN DE USUARIOS (EL LLAVERO)
  // =======================================================

  // Obtener las carteras de un usuario específico (Útil para el Login/Zustand)
  async findByUser(userId: number) {
    return this.portfolioUserRepo.find({
      where: { userId, portfolio: { isActive: true } },
      relations: ['portfolio'],
    });
  }

  //===============HELPERS================
  private async validateUsers(userIds: number[]) {
    await Promise.all(
      userIds.map((id) => this.validationService.findUserById(id)),
    );
  }

  private async findOneClean(id: number) {
    return this.portfolioRepo.findOne({
      where: { id },
      relations: { users: { user: true } },
      select: {
        id: true,
        code: true,
        type: true,
        province: true,
        zone: true,
        isActive: true,
        users: {
          id: true,
          roleInPortfolio: true,
          user: { id: true, codUser: true, firstName: true, lastName: true },
        },
      },
    });
  }
}
