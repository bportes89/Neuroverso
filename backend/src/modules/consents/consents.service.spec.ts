import { Test, TestingModule } from '@nestjs/testing';
import { ConsentsService } from './consents.service';
import { PrismaService } from '../../config/prisma.service';

describe('ConsentsService', () => {
  let service: ConsentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsentsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ConsentsService>(ConsentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
