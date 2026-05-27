import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Delivery } from './entities/delivery.entity';
import { Repository } from 'typeorm';
import { CommonValidationService } from 'src/common/common-validation.service';

@Injectable()
export class DeliverysService {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    private readonly validationService: CommonValidationService,
  ) {}

  async create(createDeliveryDto: CreateDeliveryDto) {
    await this.validationService.findUserById(createDeliveryDto.userId);
    await this.validationService.findClientById(createDeliveryDto.clientId!);
    const delivery = this.deliveryRepository.create(createDeliveryDto);
    await this.deliveryRepository.save(delivery);
    return {
      message: 'Delivery created successfully',
      deliveryId: delivery.id,
    };
  }

  async findAll() {
    const queyryBuilder =
      this.deliveryRepository.createQueryBuilder('delivery');
    queyryBuilder.leftJoin('delivery.client', 'client');
    queyryBuilder
      .leftJoin('delivery.user', 'user')
      .select([
        'delivery.id',
        'delivery.deliveryDate',
        'delivery.deliveryItems',
        'client.id',
        'client.businessName',
        'user.id',
        'user.firstName',
        'user.lastName',
      ]);
    return await queyryBuilder.getMany();
  }

  async findOne(id: number) {
    const query = this.deliveryRepository.createQueryBuilder('delivery');
    query.leftJoin('delivery.client', 'client');
    query.leftJoin('delivery.user', 'user');
    query.select([
      'delivery.id',
      'delivery.deliveryDate',
      'delivery.deliveryItems',
      'delivery.createdAt',
      'delivery.updatedAt',
      'client.id',
      'client.businessName',
      'client.ruc',
      'user.id',
      'user.firstName',
      'user.lastName',
    ]);
    query.where('delivery.id = :id', { id });
    const delivery = await query.getOne();
    if (!delivery) {
      throw new NotFoundException(`No se encontró el delivery con el ID ${id}`);
    }
    return delivery;
  }

  async update(id: number, updateDeliveryDto: UpdateDeliveryDto) {
    const { deliveryItems, ...updateDto } = updateDeliveryDto;
    if (deliveryItems) {
      updateDto['deliveryItems'] = deliveryItems;
    }
    await this.deliveryRepository.update(id, updateDto);
    return `This action updates a #${id} delivery`;
  }

  async remove(id: number) {
    const delivery = await this.findOne(id);
    if (!delivery) {
      throw new Error('Delivery not found');
    }
    await this.deliveryRepository.remove(delivery);
    return {
      message: 'Delivery removed successfully',
      deliveryId: delivery.id,
    };
  }
}
