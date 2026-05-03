import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitsService } from './visits.service';
import { VisitsController } from './visits.controller';
import { Visit } from './entities/visit.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Visit]), CommonModule],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService, TypeOrmModule],
})
export class VisitsModule {}
