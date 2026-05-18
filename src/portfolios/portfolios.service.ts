import { Injectable } from '@nestjs/common';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Portfolio } from './entities/portfolio.entity';
import { Repository } from 'typeorm';
import { PortfolioUser } from './entities/portfolio-user.entity';

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectRepository(Portfolio)
    private portfolioRepo: Repository<Portfolio>,
    @InjectRepository(PortfolioUser)
    private portfolioUserRepo: Repository<PortfolioUser>,
  ) {}
  create(createPortfolioDto: CreatePortfolioDto) {
    return 'This action adds a new portfolio';
  }

  async findAll() {
    return this.portfolioRepo.find({ where: { isActive: true } });
  }

  async findByUser(userId: number) {
    const assignments = await this.portfolioUserRepo.find({
      where: { userId },
      relations: ['portfolio'], // Trae los datos de la cartera
    });

    // Mapeamos para devolver un array limpio de carteras
    return assignments.map((a) => ({
      ...a.portfolio,
      roleInPortfolio: a.roleInPortfolio, // Le adjuntamos su rol
    }));
  }

  findOne(id: number) {
    return `This action returns a #${id} portfolio`;
  }

  update(id: number, updatePortfolioDto: UpdatePortfolioDto) {
    return `This action updates a #${id} portfolio`;
  }

  remove(id: number) {
    return `This action removes a #${id} portfolio`;
  }
}
