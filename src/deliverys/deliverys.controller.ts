import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { DeliverysService } from './deliverys.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { QueryDeliveryDto } from './dto/query-delivery.dto';
import { CurrentUser } from 'src/auth/decorators';
import { User } from 'src/users/entities';

@Controller('deliverys')
export class DeliverysController {
  constructor(private readonly deliverysService: DeliverysService) {}

  @Post()
  create(
    @Body() createDeliveryDto: CreateDeliveryDto,
    @CurrentUser() user: User,
  ) {
    return this.deliverysService.create(createDeliveryDto, user);
  }

  @Get()
  findAll(@Query() queryDto: QueryDeliveryDto, @CurrentUser() user: User) {
    return this.deliverysService.findAll(queryDto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.deliverysService.findOne(+id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
    @CurrentUser() user: User,
  ) {
    return this.deliverysService.update(+id, updateDeliveryDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.deliverysService.remove(+id, user);
  }
}
