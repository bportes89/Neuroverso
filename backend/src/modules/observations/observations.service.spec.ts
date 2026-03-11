import { Test, TestingModule } from '@nestjs/testing';
import { ObservationsService } from './observations.service';
import { PrismaService } from '../../config/prisma.service';

describe('ObservationsService', () => {
  let service: ObservationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObservationsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ObservationsService>(ObservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
