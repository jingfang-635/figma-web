import { Module } from '@nestjs/common';
import { NavItemsService } from './nav-items.service';
import { NavItemsController } from './nav-items.controller';

@Module({
  controllers: [NavItemsController],
  providers: [NavItemsService],
})
export class NavItemsModule {}
