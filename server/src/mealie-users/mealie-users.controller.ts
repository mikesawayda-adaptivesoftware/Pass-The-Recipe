import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MealieUsersService, MealieUserImportDto } from './mealie-users.service';

@Controller('api/mealie-users')
@UseGuards(AuthGuard('jwt'))
export class MealieUsersController {
  constructor(private readonly mealieUsersService: MealieUsersService) {}

  /**
   * Get all imported Mealie users
   */
  @Get()
  async findAll() {
    return this.mealieUsersService.findAll();
  }

  /**
   * Get a single Mealie user by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mealieUsersService.findOne(id);
  }

  /**
   * Bulk import Mealie users
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importUsers(@Body() mealieUsers: MealieUserImportDto[]) {
    return this.mealieUsersService.upsertFromImport(mealieUsers);
  }

  /**
   * Link a Mealie user to an app account
   */
  @Post(':id/link')
  async linkToUser(
    @Param('id') mealieUserId: string,
    @Body('userId') userId: string,
  ) {
    return this.mealieUsersService.linkToUser(mealieUserId, userId);
  }

  /**
   * Unlink a Mealie user from an app account
   */
  @Post(':id/unlink')
  async unlinkUser(@Param('id') mealieUserId: string) {
    return this.mealieUsersService.unlinkUser(mealieUserId);
  }

  /**
   * Auto-link all Mealie users to app accounts by email
   */
  @Post('auto-link')
  @HttpCode(HttpStatus.OK)
  async autoLink() {
    return this.mealieUsersService.autoLinkByEmail();
  }
}

