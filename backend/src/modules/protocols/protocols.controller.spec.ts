import { Test, TestingModule } from '@nestjs/testing';
import { ProtocolsController } from './protocols.controller';
import { ProtocolsService } from './protocols.service';

describe('ProtocolsController', () => {
  let controller: ProtocolsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProtocolsController],
      providers: [{ provide: ProtocolsService, useValue: {} }],
    }).compile();

    controller = module.get<ProtocolsController>(ProtocolsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should return empty array', () => {
    expect(controller.findAll()).toEqual([]);
  });
});
