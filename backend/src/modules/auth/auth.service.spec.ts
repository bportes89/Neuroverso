import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../config/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: { user: { findUnique: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    prismaService = { user: { findUnique: jest.fn() } };
    jwtService = { sign: jest.fn().mockReturnValue('test-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw UnauthorizedException for non-existent user', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    await expect(service.login('test@test.com', 'password')).rejects.toThrow(UnauthorizedException);
  });
});
