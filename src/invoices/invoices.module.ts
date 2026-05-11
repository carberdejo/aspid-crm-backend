import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice]), CommonModule], // Aquí agregaríamos las entidades relacionadas con Facturas si las tuviéramos
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
