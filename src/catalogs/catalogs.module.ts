import { Module } from '@nestjs/common';
import { IndustrySegmentsService } from './industry-segments.service';
import { IndustrySegmentsController } from './industry-segments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndustrySegment } from './entities/industry-segment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IndustrySegment])],
  controllers: [IndustrySegmentsController],
  providers: [IndustrySegmentsService],
  exports: [IndustrySegmentsService, TypeOrmModule], // Exporta el servicio si otros módulos lo necesitan
})
export class CatalogsModule {}
