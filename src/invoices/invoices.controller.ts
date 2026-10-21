import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { AnnulDocumentDto } from 'src/orders/dto/annul-document.dto';
import { CurrentUser } from 'src/auth/decorators';
import { User } from 'src/users/entities';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser() user: User,
  ) {
    return this.invoicesService.create(createInvoiceDto, user);
  }

  @Get()
  findAll(@Query() query: QueryInvoiceDto, @CurrentUser() user: User) {
    return this.invoicesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.invoicesService.findOne(+id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @CurrentUser() user: User,
  ) {
    return this.invoicesService.update(id, updateInvoiceDto, user);
  }

  // Anular en lugar de eliminar: el número de la factura queda reservado
  @Patch(':id/annul')
  annul(
    @Param('id', ParseIntPipe) id: number,
    @Body() annulDto: AnnulDocumentDto,
    @CurrentUser() user: User,
  ) {
    return this.invoicesService.annul(id, annulDto, user);
  }
}
