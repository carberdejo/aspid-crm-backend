import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { IndustrySegmentsService } from './industry-segments.service';
import { CreateIndustrySegmentDto } from './dto/create-industry-segment.dto';
import { UpdateIndustrySegmentDto } from './dto/update-industry-segment.dto';
import { QueryIndustrySegmentDto } from './dto/query-industry-segment.dto';

@Controller('catalogs/segments')
export class IndustrySegmentsController {
  constructor(private readonly segmentsService: IndustrySegmentsService) {}

  // Solo trae los activos. Cualquiera logueado puede consumirlo.
  @Get()
  findAll(@Query() query: QueryIndustrySegmentDto) {
    return this.segmentsService.findAll(query);
  }

  @Post()
  create(@Body() createDto: CreateIndustrySegmentDto) {
    return this.segmentsService.create(createDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateIndustrySegmentDto,
  ) {
    return this.segmentsService.update(id, updateDto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.segmentsService.deactivate(id);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.segmentsService.reactivate(id);
  }
}
