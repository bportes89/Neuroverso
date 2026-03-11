import { Test, TestingModule } from '@nestjs/testing';
import { ChildrenService } from './children.service';
import { PrismaService } from '../../config/prisma.service';

describe('ChildrenService', () => {
  let service: ChildrenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChildrenService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ChildrenService>(ChildrenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
