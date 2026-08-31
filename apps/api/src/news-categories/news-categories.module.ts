import { Module } from '@nestjs/common';
import { NewsCategoriesService } from './news-categories.service';
import { NewsCategoriesController } from './news-categories.controller';

@Module({
  controllers: [NewsCategoriesController],
  providers: [NewsCategoriesService],
})
export class NewsCategoriesModule {}
