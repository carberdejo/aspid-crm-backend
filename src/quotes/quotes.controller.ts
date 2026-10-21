import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QueryQuoteDto } from './dto/query-quote.dto';
import { RemoveQuoteDto } from './dto/remove-quote.dto';
import { CurrentUser } from 'src/auth/decorators';
import { User } from 'src/users/entities';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto, @CurrentUser() user: User) {
    return this.quotesService.create(createQuoteDto, user);
  }

  @Get()
  findAll(@Query() query: QueryQuoteDto, @CurrentUser() user: User) {
    return this.quotesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quotesService.findOne(+id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @CurrentUser() user: User,
  ) {
    return this.quotesService.update(+id, updateQuoteDto, user);
  }

  @Patch('delete/:id')
  remove(
    @Param('id') id: string,
    @Body() removeQuoteDto: RemoveQuoteDto,
    @CurrentUser() user: User,
  ) {
    return this.quotesService.remove(+id, removeQuoteDto, user);
  }
}
