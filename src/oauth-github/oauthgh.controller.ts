import { Body, Controller, Get, Param, Query, Post } from '@nestjs/common';
import { OAuthGHService } from './oauthgh.service';
import { Public } from '@src/auth/decorators/public.decorator';

@Controller('/oauth/github')
export class OAuthGHController {
  constructor(private readonly oauthGHService: OAuthGHService) {}

  @Public()
  @Get('/getAccessToken/:code')
  async githubAuth(@Param('code') code: string) {
    console.log('CODE IN CONTROLLER:', code);
    return this.oauthGHService.githubAuth(code);
  }

  @Public()
  @Get('/getUserData')
  async getGitHubUserDataPost(@Body('accessToken') accessToken: string) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    return this.oauthGHService.getGitHubUserData(accessToken);
  }
}
