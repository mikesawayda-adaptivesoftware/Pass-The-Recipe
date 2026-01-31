import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
  Request,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('search')
  async searchByEmail(@Query('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    return user || null;
  }

  @Get('friends')
  async getFriends(@Request() req) {
    return this.usersService.getFriends(req.user.id);
  }

  @Delete('friends/:friendId')
  async removeFriend(@Request() req, @Param('friendId') friendId: string) {
    await this.usersService.removeFriend(req.user.id, friendId);
    return { success: true };
  }

  @Put('settings')
  async updateSettings(
    @Request() req,
    @Body() settings: { shareAllRecipesWithFriends?: boolean },
  ) {
    return this.usersService.updateSettings(req.user.id, settings);
  }

  @Get('favorites')
  async getFavorites(@Request() req) {
    return this.usersService.getFavorites(req.user.id);
  }

  @Get('favorites/:recipeId')
  async isFavorite(@Request() req, @Param('recipeId') recipeId: string) {
    return this.usersService.isFavorite(req.user.id, recipeId);
  }

  @Post('favorites/:recipeId')
  async addFavorite(@Request() req, @Param('recipeId') recipeId: string) {
    return this.usersService.addFavorite(req.user.id, recipeId);
  }

  @Delete('favorites/:recipeId')
  async removeFavorite(@Request() req, @Param('recipeId') recipeId: string) {
    return this.usersService.removeFavorite(req.user.id, recipeId);
  }
}

