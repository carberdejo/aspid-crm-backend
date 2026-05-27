import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DeliverysService } from './deliverys.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

@Controller('deliverys')
export class DeliverysController {
  constructor(private readonly deliverysService: DeliverysService) {}

  @Post()
  create(@Body() createDeliveryDto: CreateDeliveryDto) {
    return this.deliverysService.create(createDeliveryDto);
  }

  @Get()
  findAll() {
    return this.deliverysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliverysService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeliveryDto: UpdateDeliveryDto) {
    return this.deliverysService.update(+id, updateDeliveryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deliverysService.remove(+id);
  }
}
