import { Test, TestingModule } from '@nestjs/testing';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';

describe('GuardiansController', () => {
  let controller: GuardiansController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuardiansController],
      providers: [{ provide: GuardiansService, useValue: {} }],
    }).compile();

    controller = module.get<GuardiansController>(GuardiansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should return empty array', () => {
    expect(controller.findAll()).toEqual([]);
  });
});
