import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QueryQuoteDto } from './dto/query-quote.dto';
import { RemoveQuoteDto } from './dto/remove-quote.dto';
import { QuoteMetricsQueryDto } from 'src/analytics/dto/quote-metrics-query.dto';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(createQuoteDto);
  }

  @Get()
  findAll(@Query() query: QueryQuoteDto) {
    return this.quotesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto) {
    return this.quotesService.update(+id, updateQuoteDto);
  }

  @Patch('delete/:id')
  remove(@Param('id') id: string, @Body() removeQuoteDto: RemoveQuoteDto) {
    return this.quotesService.remove(+id, removeQuoteDto);
  }

  @Get('metrics/:userId')
  getMetrics(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: QuoteMetricsQueryDto,
  ) {
    // Sobrescribimos el userId con el del token por seguridad
    return this.quotesService.getMetrics(userId, query);
  }
}
