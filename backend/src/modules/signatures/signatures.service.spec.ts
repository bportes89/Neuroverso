import { Test, TestingModule } from '@nestjs/testing';
import { SignaturesService } from './signatures.service';
import { PrismaService } from '../../config/prisma.service';

describe('SignaturesService', () => {
  let service: SignaturesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignaturesService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<SignaturesService>(SignaturesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
