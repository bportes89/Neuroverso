import { Test, TestingModule } from '@nestjs/testing';
import { ProtocolsService } from './protocols.service';
import { PrismaService } from '../../config/prisma.service';

describe('ProtocolsService', () => {
  let service: ProtocolsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProtocolsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ProtocolsService>(ProtocolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
