import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShoppingListsService } from './shopping-lists.service';

@Controller('api/shopping-lists')
@UseGuards(AuthGuard('jwt'))
export class ShoppingListsController {
  constructor(private readonly shoppingListsService: ShoppingListsService) {}

  /**
   * Create a new shopping list
   */
  @Post()
  async create(
    @Request() req: any,
    @Body() body: { name: string; recipeIds?: string[] },
  ) {
    return this.shoppingListsService.create(req.user.id, body);
  }

  /**
   * Get all shopping lists for the current user
   */
  @Get()
  async findAll(@Request() req: any) {
    return this.shoppingListsService.findAll(req.user.id);
  }

  /**
   * Get a single shopping list
   */
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.shoppingListsService.findOne(id, req.user.id);
  }

  /**
   * Add recipes to a shopping list
   */
  @Post(':id/recipes')
  async addRecipes(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { recipeIds: string[] },
  ) {
    return this.shoppingListsService.addRecipes(
      id,
      req.user.id,
      body.recipeIds,
    );
  }

  /**
   * Toggle item checked status
   */
  @Post(':id/items/:itemId/toggle')
  async toggleItem(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.shoppingListsService.toggleItem(id, itemId, req.user.id);
  }

  /**
   * Add a manual item to the list
   */
  @Post(':id/items')
  async addItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name: string; quantity?: number; unit?: string; note?: string },
  ) {
    return this.shoppingListsService.addItem(id, req.user.id, body);
  }

  /**
   * Update an item
   */
  @Put(':id/items/:itemId')
  async updateItem(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { name?: string; quantity?: number; unit?: string; note?: string },
  ) {
    return this.shoppingListsService.updateItem(
      id,
      itemId,
      req.user.id,
      body,
    );
  }

  /**
   * Remove an item from the list
   */
  @Delete(':id/items/:itemId')
  async removeItem(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    await this.shoppingListsService.removeItem(id, itemId, req.user.id);
    return { success: true };
  }

  /**
   * Toggle list complete status
   */
  @Post(':id/toggle-complete')
  async toggleComplete(@Request() req: any, @Param('id') id: string) {
    return this.shoppingListsService.toggleComplete(id, req.user.id);
  }

  /**
   * Clear all checked items
   */
  @Post(':id/clear-checked')
  async clearChecked(@Request() req: any, @Param('id') id: string) {
    return this.shoppingListsService.clearChecked(id, req.user.id);
  }

  /**
   * Delete a shopping list
   */
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    await this.shoppingListsService.delete(id, req.user.id);
    return { success: true };
  }
}

