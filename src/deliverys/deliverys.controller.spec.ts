import { Test, TestingModule } from '@nestjs/testing';
import { DeliverysController } from './deliverys.controller';
import { DeliverysService } from './deliverys.service';

describe('DeliverysController', () => {
  let controller: DeliverysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliverysController],
      providers: [DeliverysService],
    }).compile();

    controller = module.get<DeliverysController>(DeliverysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
