import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Get()
  @Public()
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @Public()
  getHealthCheck(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
