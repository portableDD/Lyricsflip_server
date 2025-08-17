import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get Hello World' })
  @ApiResponse({ status: 200, description: 'Returns Hello World string.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
