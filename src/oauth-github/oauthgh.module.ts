import { Module } from '@nestjs/common';
import { OAuthGHController } from './oauthgh.controller';
import { OAuthGHService } from './oauthgh.service';

@Module({
  controllers: [OAuthGHController],
  providers: [OAuthGHService],
})
export class OAuthGHModule {}
