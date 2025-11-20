import { Controller, Get, Param } from '@nestjs/common';
import { OAuthGHService } from './oauthgh.service';
import { Public } from '@src/auth/decorators/public.decorator';

@Controller('/oauth/github')
export class OAuthGHController {
  constructor(private readonly oauthGHService: OAuthGHService) {}

  @Public()
  @Get('/getAccessToken/:code')
  async githubAuth(@Param('code') code: string) {
    console.log('CODE IN CONTROLLER:', code);
    // Remover el prefijo "code=" si existe
    const cleanCode = code.startsWith('code=') ? code.substring(5) : code;
    return this.oauthGHService.githubAuth(cleanCode);
  }
}
