import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { ImportController } from './import.controller';
import { Recipe, User } from '../common/entities';
import { IngredientsModule } from '../ingredients/ingredients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, User]),
    MulterModule.register({
      dest: './uploads',
    }),
    IngredientsModule,
  ],
  providers: [RecipesService],
  controllers: [RecipesController, ImportController],
  exports: [RecipesService],
})
export class RecipesModule {}

