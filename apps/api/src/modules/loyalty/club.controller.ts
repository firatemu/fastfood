import { ErrorCodes } from '@fastfood/contracts';
import {
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';

import { ClubService } from './club.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

@Controller({ path: 'me' })
@UseGuards(AuthGuard, AccountStatusGuard)
export class ClubController {
  constructor(@Inject(ClubService) private readonly club: ClubService) {}

  private principal(
    request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): AuthenticatedPrincipal {
    if (!request.principal) {
      throw new NotFoundException({
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'No principal.',
      });
    }
    return request.principal;
  }

  @Get('club')
  async clubSnapshot(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.principal(request);
    return { data: await this.club.getSnapshot(principal.id), meta: { requestId: REQUEST_ID } };
  }

  @Post('club/welcome')
  @HttpCode(200)
  async welcome(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.principal(request);
    await this.club.grantWelcomeIfEligible(principal.id);
    return { data: await this.club.getSnapshot(principal.id), meta: { requestId: REQUEST_ID } };
  }
}
