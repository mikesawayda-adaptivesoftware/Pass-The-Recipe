import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListsController } from './shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists.service';
import { ShoppingList, ShoppingListItem, Recipe } from '../common/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ShoppingList, ShoppingListItem, Recipe])],
  controllers: [ShoppingListsController],
  providers: [ShoppingListsService],
  exports: [ShoppingListsService],
})
export class ShoppingListsModule {}

