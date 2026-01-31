import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IngredientsService, ParsedIngredient } from './ingredients.service';
import { KnownIngredient, KnownUnit, KnownModifier } from '../common/entities';

@Controller('api/ingredients')
@UseGuards(AuthGuard('jwt'))
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  /**
   * Get all known ingredients
   */
  @Get()
  async findAllIngredients(): Promise<KnownIngredient[]> {
    return this.ingredientsService.findAllIngredients();
  }

  /**
   * Search ingredients by name
   */
  @Get('search')
  async searchIngredients(@Query('q') query: string): Promise<KnownIngredient[]> {
    return this.ingredientsService.searchIngredients(query);
  }

  /**
   * Get all known units
   */
  @Get('units')
  async findAllUnits(): Promise<KnownUnit[]> {
    return this.ingredientsService.findAllUnits();
  }

  /**
   * Get all known modifiers
   */
  @Get('modifiers')
  async findAllModifiers(): Promise<KnownModifier[]> {
    return this.ingredientsService.findAllModifiers();
  }

  /**
   * Parse an ingredient string
   */
  @Post('parse')
  async parseIngredient(@Body() body: { text: string }): Promise<ParsedIngredient> {
    return this.ingredientsService.parseIngredient(body.text);
  }

  /**
   * Parse multiple ingredients
   */
  @Post('parse-many')
  async parseIngredients(@Body() body: { texts: string[] }): Promise<ParsedIngredient[]> {
    return Promise.all(
      body.texts.map(text => this.ingredientsService.parseIngredient(text))
    );
  }

  /**
   * Create a new ingredient
   */
  @Post()
  async createIngredient(
    @Body() body: { name: string; category?: string; aliases?: string[]; defaultUnit?: string }
  ): Promise<KnownIngredient> {
    return this.ingredientsService.createIngredient(body as any);
  }

  /**
   * Create a new unit
   */
  @Post('units')
  async createUnit(
    @Body() body: { name: string; abbreviation?: string; aliases?: string[]; type?: string }
  ): Promise<KnownUnit> {
    return this.ingredientsService.createUnit(body as any);
  }

  /**
   * Create a new modifier
   */
  @Post('modifiers')
  async createModifier(
    @Body() body: { name: string; type?: string; aliases?: string[] }
  ): Promise<KnownModifier> {
    return this.ingredientsService.createModifier(body as any);
  }
}

