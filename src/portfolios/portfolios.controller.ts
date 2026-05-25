import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QueryPortfolioDto } from './dto/query-portfolio.dto';
import { Auth, CurrentUser } from 'src/auth/decorators';
import { User } from 'src/users/entities';
import { Role } from 'src/users/interfaces';

@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Post()
  @Auth(Role.ADMIN) // Solo administradores pueden crear carteras
  create(@Body() createPortfolioDto: CreatePortfolioDto) {
    return this.portfoliosService.create(createPortfolioDto);
  }

  @Get()
  @Auth() // Cualquier usuario autenticado puede listar carteras
  findAll(
    @Query() paginationDto: QueryPortfolioDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.portfoliosService.findAll(paginationDto, currentUser);
  }

  @Get(':id')
  @Auth() // Cualquier usuario autenticado puede ver los detalles de una cartera
  findOne(@Param('id') id: string) {
    return this.portfoliosService.findOne(+id);
  }

  @Patch(':id')
  @Auth(Role.ADMIN) // Solo administradores pueden actualizar una cartera
  update(
    @Param('id') id: string,
    @Body() updatePortfolioDto: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.update(+id, updatePortfolioDto);
  }

  @Patch(':id/deactivate')
  @Auth(Role.ADMIN) // Solo administradores pueden desactivar una cartera
  deactivate(@Param('id') id: string) {
    return this.portfoliosService.deactivate(+id);
  }
}
