import { Test, TestingModule } from '@nestjs/testing';
import { GuardiansService } from './guardians.service';
import { PrismaService } from '../../config/prisma.service';

describe('GuardiansService', () => {
  let service: GuardiansService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuardiansService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<GuardiansService>(GuardiansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
