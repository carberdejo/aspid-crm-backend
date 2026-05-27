import { Test, TestingModule } from '@nestjs/testing';
import { DeliverysService } from './deliverys.service';

describe('DeliverysService', () => {
  let service: DeliverysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliverysService],
    }).compile();

    service = module.get<DeliverysService>(DeliverysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
