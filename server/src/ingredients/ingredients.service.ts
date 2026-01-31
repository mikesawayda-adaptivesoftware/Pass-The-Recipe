import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import {
  KnownIngredient,
  KnownUnit,
  KnownModifier,
} from '../common/entities';
import type { IIngredientParser, ParsedIngredient } from './parsers';
import { INGREDIENT_PARSER } from './parsers';

// Re-export ParsedIngredient for backward compatibility
export type { ParsedIngredient } from './parsers';

@Injectable()
export class IngredientsService {
  private readonly logger = new Logger(IngredientsService.name);

  constructor(
    @InjectRepository(KnownIngredient)
    private ingredientRepo: Repository<KnownIngredient>,
    @InjectRepository(KnownUnit)
    private unitRepo: Repository<KnownUnit>,
    @InjectRepository(KnownModifier)
    private modifierRepo: Repository<KnownModifier>,
    @Inject(INGREDIENT_PARSER)
    private parser: IIngredientParser,
  ) {
    this.logger.log(`Using ${parser.getParserType()} ingredient parser`);
  }

  // ============ CRUD Operations ============

  async findAllIngredients(): Promise<KnownIngredient[]> {
    return this.ingredientRepo.find({ order: { name: 'ASC' } });
  }

  async findAllUnits(): Promise<KnownUnit[]> {
    return this.unitRepo.find({ order: { name: 'ASC' } });
  }

  async findAllModifiers(): Promise<KnownModifier[]> {
    return this.modifierRepo.find({ order: { name: 'ASC' } });
  }

  async searchIngredients(query: string): Promise<KnownIngredient[]> {
    if (!query || query.length < 2) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Search by name and aliases
    const results = await this.ingredientRepo
      .createQueryBuilder('ing')
      .where('LOWER(ing.name) LIKE :query', { query: `%${normalizedQuery}%` })
      .orWhere('LOWER(ing.aliases) LIKE :query', { query: `%${normalizedQuery}%` })
      .orderBy('ing.name', 'ASC')
      .limit(20)
      .getMany();
    
    return results;
  }

  async createIngredient(data: Partial<KnownIngredient>): Promise<KnownIngredient> {
    const ingredient = this.ingredientRepo.create(data);
    return this.ingredientRepo.save(ingredient);
  }

  async createUnit(data: Partial<KnownUnit>): Promise<KnownUnit> {
    const unit = this.unitRepo.create(data);
    return this.unitRepo.save(unit);
  }

  async createModifier(data: Partial<KnownModifier>): Promise<KnownModifier> {
    const modifier = this.modifierRepo.create(data);
    return this.modifierRepo.save(modifier);
  }

  // ============ Parsing Logic ============

  /**
   * Parse an ingredient string into structured data
   * Uses the injected parser (rules-based or LLM)
   */
  async parseIngredient(text: string): Promise<ParsedIngredient> {
    return this.parser.parse(text);
  }

  /**
   * Get the current parser type
   */
  getParserType(): string {
    return this.parser.getParserType();
  }

  /**
   * Auto-create a new ingredient if not found
   */
  async findOrCreateIngredient(name: string, category?: string): Promise<KnownIngredient> {
    const normalizedName = name.trim();
    
    // Try to find existing
    let ingredient = await this.ingredientRepo.findOne({
      where: { name: ILike(normalizedName) },
    });
    
    if (!ingredient) {
      // Check aliases
      const allIngredients = await this.ingredientRepo.find();
      ingredient = allIngredients.find(ing => 
        ing.aliases?.some(alias => alias.toLowerCase() === normalizedName.toLowerCase())
      ) || null;
    }
    
    if (!ingredient) {
      // Create new ingredient
      ingredient = await this.ingredientRepo.save(
        this.ingredientRepo.create({
          name: this.capitalizeWords(normalizedName),
          category: (category as any) || 'other',
          aliases: [],
        }),
      );
    }
    
    return ingredient;
  }

  /**
   * Capitalize words properly
   */
  private capitalizeWords(text: string): string {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
