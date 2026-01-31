import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Recipe, User, Ingredient } from '../common/entities';
import { CreateRecipeDto, UpdateRecipeDto } from './dto/recipe.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async findByName(userId: string, name: string): Promise<Recipe | null> {
    return this.recipeRepository.findOne({
      where: { 
        ownerId: userId,
        name: name,
      },
    });
  }

  async findWithUnparsedIngredients(userId: string): Promise<Recipe[]> {
    return this.recipeRepository.find({
      where: { 
        ownerId: userId,
        hasUnparsedIngredients: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Migration: Updates all existing recipes to have:
   * - hasUnparsedIngredients = false
   * - All ingredients have parsed = true
   * This is for recipes that were imported before the parsed tracking was added.
   */
  async migrateExistingRecipes(): Promise<{ updated: number }> {
    const recipes = await this.recipeRepository.find();
    let updated = 0;

    for (const recipe of recipes) {
      let needsUpdate = false;

      // Check if hasUnparsedIngredients needs to be set
      if (recipe.hasUnparsedIngredients === undefined || recipe.hasUnparsedIngredients === null) {
        recipe.hasUnparsedIngredients = false;
        needsUpdate = true;
      }

      // Check if any ingredients are missing the parsed field
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const updatedIngredients = recipe.ingredients.map((ing: Ingredient) => {
          if (ing.parsed === undefined) {
            needsUpdate = true;
            return { ...ing, parsed: true }; // Assume existing ingredients are parsed
          }
          return ing;
        });
        if (needsUpdate) {
          recipe.ingredients = updatedIngredients;
        }
      }

      if (needsUpdate) {
        await this.recipeRepository.save(recipe);
        updated++;
      }
    }

    return { updated };
  }

  async create(userId: string, createDto: CreateRecipeDto): Promise<Recipe> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Handle sharedWith users
    let sharedWithUsers: User[] = [];
    if (createDto.sharedWith && createDto.sharedWith.length > 0) {
      sharedWithUsers = await this.userRepository.find({
        where: { id: In(createDto.sharedWith) },
      });
    }

    const recipe = this.recipeRepository.create({
      name: createDto.name,
      description: createDto.description,
      prepTime: createDto.prepTime,
      cookTime: createDto.cookTime,
      totalTime: createDto.totalTime,
      servings: createDto.servings,
      sourceUrl: createDto.sourceUrl,
      imageUrl: createDto.imageUrl,
      category: createDto.category,
      ownerId: userId,
      slug: this.generateSlug(createDto.name),
      ingredients: createDto.ingredients || [],
      instructions: createDto.instructions || [],
      tags: createDto.tags || [],
      isShared: createDto.isShared || false,
      sharedWith: sharedWithUsers,
      originalMealieUserId: createDto.originalMealieUserId,
      hasUnparsedIngredients: createDto.hasUnparsedIngredients ?? false,
    });

    return this.recipeRepository.save(recipe);
  }

  async update(
    recipeId: string,
    userId: string,
    updateDto: UpdateRecipeDto,
  ): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
      relations: ['sharedWith'],
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    if (recipe.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to update this recipe');
    }

    // Update basic fields
    if (updateDto.name !== undefined) {
      recipe.name = updateDto.name;
      recipe.slug = this.generateSlug(updateDto.name);
    }
    if (updateDto.description !== undefined) recipe.description = updateDto.description;
    if (updateDto.prepTime !== undefined) recipe.prepTime = updateDto.prepTime;
    if (updateDto.cookTime !== undefined) recipe.cookTime = updateDto.cookTime;
    if (updateDto.totalTime !== undefined) recipe.totalTime = updateDto.totalTime;
    if (updateDto.servings !== undefined) recipe.servings = updateDto.servings;
    if (updateDto.sourceUrl !== undefined) recipe.sourceUrl = updateDto.sourceUrl;
    if (updateDto.category !== undefined) recipe.category = updateDto.category;
    if (updateDto.ingredients !== undefined) {
      recipe.ingredients = updateDto.ingredients;
      // Recalculate hasUnparsedIngredients based on actual ingredient data
      recipe.hasUnparsedIngredients = updateDto.ingredients.some(
        (ing: any) => ing.parsed === false || (!ing.knownIngredientId && !ing.parsed)
      );
    }
    if (updateDto.instructions !== undefined) recipe.instructions = updateDto.instructions;
    if (updateDto.tags !== undefined) recipe.tags = updateDto.tags;
    if (updateDto.isShared !== undefined) recipe.isShared = updateDto.isShared;
    if (updateDto.imageUrl !== undefined) recipe.imageUrl = updateDto.imageUrl;

    // Handle sharedWith users
    if (updateDto.sharedWith !== undefined) {
      if (updateDto.sharedWith.length > 0) {
        const sharedUsers = await this.userRepository.find({
          where: { id: In(updateDto.sharedWith) },
        });
        recipe.sharedWith = sharedUsers;
      } else {
        recipe.sharedWith = [];
      }
    }

    return this.recipeRepository.save(recipe);
  }

  async delete(recipeId: string, userId: string): Promise<void> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    if (recipe.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to delete this recipe');
    }

    // Delete image if exists
    if (recipe.imageUrl) {
      const imagePath = path.join(process.cwd(), 'uploads', path.basename(recipe.imageUrl));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await this.recipeRepository.remove(recipe);
  }

  async findOne(recipeId: string, userId: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
      relations: ['owner', 'sharedWith', 'originalMealieUser'],
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check access
    const hasAccess = await this.userHasAccess(recipe, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view this recipe');
    }

    // Sanitize owner data
    if (recipe.owner) {
      const { password, ...ownerWithoutPassword } = recipe.owner;
      return {
        ...recipe,
        owner: ownerWithoutPassword,
      } as unknown as Recipe;
    }

    return recipe;
  }

  async findMyRecipes(userId: string): Promise<Recipe[]> {
    const recipes = await this.recipeRepository.find({
      where: { ownerId: userId },
      relations: ['originalMealieUser', 'owner'],
      order: { createdAt: 'DESC' },
    });

    // Sanitize owner data (remove password)
    return recipes.map((r) => {
      if (r.owner) {
        const { password, ...ownerWithoutPassword } = r.owner;
        return {
          ...r,
          owner: ownerWithoutPassword,
        } as unknown as Recipe;
      }
      return r;
    });
  }

  async findSharedWithMe(userId: string): Promise<Recipe[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['friends'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const friendIds = user.friends.map((f) => f.id);

    // Get recipes shared specifically with this user
    const sharedWithMe = await this.recipeRepository
      .createQueryBuilder('recipe')
      .leftJoin('recipe.sharedWith', 'sharedUser')
      .leftJoinAndSelect('recipe.owner', 'owner')
      .leftJoinAndSelect('recipe.originalMealieUser', 'originalMealieUser')
      .where('sharedUser.id = :userId', { userId })
      .orderBy('recipe.createdAt', 'DESC')
      .getMany();

    // Get recipes from friends based on their sharing settings
    let friendsRecipes: Recipe[] = [];
    if (friendIds.length > 0) {
      // Get friends with their shareAllRecipesWithFriends setting
      const friends = await this.userRepository.find({
        where: { id: In(friendIds) },
      });

      // Friends who share all recipes
      const friendsWhoShareAll = friends
        .filter((f) => f.shareAllRecipesWithFriends)
        .map((f) => f.id);

      // Friends who only share specific recipes (isShared = true)
      const friendsWhoShareSelectively = friends
        .filter((f) => !f.shareAllRecipesWithFriends)
        .map((f) => f.id);

      // Get ALL recipes from friends who share everything
      if (friendsWhoShareAll.length > 0) {
        const allSharedRecipes = await this.recipeRepository.find({
          where: {
            ownerId: In(friendsWhoShareAll),
          },
          relations: ['owner', 'originalMealieUser'],
          order: { createdAt: 'DESC' },
        });
        friendsRecipes.push(...allSharedRecipes);
      }

      // Get only isShared=true recipes from friends who share selectively
      if (friendsWhoShareSelectively.length > 0) {
        const selectivelySharedRecipes = await this.recipeRepository.find({
          where: {
            ownerId: In(friendsWhoShareSelectively),
            isShared: true,
          },
          relations: ['owner', 'originalMealieUser'],
          order: { createdAt: 'DESC' },
        });
        friendsRecipes.push(...selectivelySharedRecipes);
      }
    }

    // Combine and deduplicate
    const allRecipes = [...sharedWithMe, ...friendsRecipes];
    const uniqueRecipes = allRecipes.filter(
      (recipe, index, self) =>
        index === self.findIndex((r) => r.id === recipe.id),
    );

    // Sanitize owner data
    return uniqueRecipes.map((r) => {
      if (r.owner) {
        const { password, ...ownerWithoutPassword } = r.owner;
        return {
          ...r,
          owner: ownerWithoutPassword,
        } as unknown as Recipe;
      }
      return r;
    });
  }

  private async userHasAccess(recipe: Recipe, userId: string): Promise<boolean> {
    // Owner always has access
    if (recipe.ownerId === userId) {
      return true;
    }

    // Check if user is in sharedWith
    if (recipe.sharedWith?.some((u) => u.id === userId)) {
      return true;
    }

    // Check if owner shares all recipes with friends OR this recipe is shared
    const owner = await this.userRepository.findOne({
      where: { id: recipe.ownerId },
      relations: ['friends'],
    });

    if (owner?.friends.some((f) => f.id === userId)) {
      // User is a friend - check if owner shares all or this recipe is shared
      if (owner.shareAllRecipesWithFriends || recipe.isShared) {
        return true;
      }
    }

    return false;
  }

  async updateImage(recipeId: string, userId: string, imageUrl: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    if (recipe.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to update this recipe');
    }

    // Delete old image if exists
    if (recipe.imageUrl) {
      const oldImagePath = path.join(process.cwd(), 'uploads', path.basename(recipe.imageUrl));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    recipe.imageUrl = imageUrl;
    return this.recipeRepository.save(recipe);
  }

  parseIngredient(text: string): Ingredient {
    const trimmed = text.trim();

    const unitPatterns = [
      'cups?', 'c\\.?', 'tablespoons?', 'tbsp?\\.?', 'teaspoons?', 'tsp?\\.?',
      'ounces?', 'oz\\.?', 'pounds?', 'lbs?\\.?', 'grams?', 'g\\.?',
      'kilograms?', 'kg\\.?', 'milliliters?', 'ml\\.?', 'liters?', 'l\\.?',
      'pinch(?:es)?', 'dash(?:es)?', 'cloves?', 'heads?', 'bunches?',
      'slices?', 'pieces?', 'cans?', 'packages?', 'sticks?',
    ].join('|');

    const regex = new RegExp(
      `^([\\d\\s\\/\\.]+)?\\s*(${unitPatterns})?\\s*(.+)$`,
      'i',
    );

    const match = trimmed.match(regex);

    if (match) {
      let quantity: number | undefined;
      const rawQuantity = match[1]?.trim();

      if (rawQuantity) {
        const parts = rawQuantity.split(/\s+/);
        quantity = parts.reduce((sum, part) => {
          if (part.includes('/')) {
            const [num, den] = part.split('/').map(Number);
            return sum + num / den;
          }
          return sum + Number(part);
        }, 0);

        if (isNaN(quantity)) quantity = undefined;
      }

      const unit = match[2]?.trim().toLowerCase();
      let name = match[3]?.trim() || trimmed;

      let note: string | undefined;
      const noteMatch = name.match(/\(([^)]+)\)/);
      if (noteMatch) {
        note = noteMatch[1];
        name = name.replace(/\([^)]+\)/, '').trim();
      }

      const commaIndex = name.indexOf(',');
      if (commaIndex > 0) {
        note = note
          ? `${note}, ${name.substring(commaIndex + 1).trim()}`
          : name.substring(commaIndex + 1).trim();
        name = name.substring(0, commaIndex).trim();
      }

      return { quantity, unit, name, note, originalText: trimmed };
    }

    return { name: trimmed, originalText: trimmed };
  }

  /**
   * Update a single ingredient in a recipe
   */
  async updateIngredient(
    recipeId: string,
    userId: string,
    ingredientIndex: number,
    updatedIngredient: Ingredient,
  ): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    if (recipe.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to update this recipe');
    }

    if (ingredientIndex < 0 || ingredientIndex >= recipe.ingredients.length) {
      throw new NotFoundException('Ingredient not found at the specified index');
    }

    // Update the ingredient
    recipe.ingredients[ingredientIndex] = {
      ...recipe.ingredients[ingredientIndex],
      ...updatedIngredient,
      parsed: true, // Mark as parsed since it was manually fixed
    };

    // Check if all ingredients are now parsed
    const hasUnparsed = recipe.ingredients.some((ing: Ingredient) => ing.parsed === false);
    recipe.hasUnparsedIngredients = hasUnparsed;

    return this.recipeRepository.save(recipe);
  }

  /**
   * Replace a single ingredient with multiple ingredients (for splitting compound ingredients)
   * Example: "salt and pepper" -> ["salt", "pepper"]
   */
  async splitIngredient(
    recipeId: string,
    userId: string,
    ingredientIndex: number,
    newIngredients: Ingredient[],
  ): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    if (recipe.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to update this recipe');
    }

    if (ingredientIndex < 0 || ingredientIndex >= recipe.ingredients.length) {
      throw new NotFoundException('Ingredient not found at the specified index');
    }

    if (!newIngredients || newIngredients.length < 1) {
      throw new Error('At least one new ingredient is required');
    }

    // Get the original ingredient for reference
    const originalIngredient = recipe.ingredients[ingredientIndex];

    // Prepare new ingredients with proper defaults
    const preparedIngredients: Ingredient[] = newIngredients.map((ing) => ({
      ...ing,
      originalText: ing.originalText || originalIngredient.originalText,
      rawLine: originalIngredient.rawLine || originalIngredient.originalText, // Preserve the raw line
      parsed: ing.parsed !== undefined ? ing.parsed : false, // Need to be matched to known ingredients
    }));

    // Replace the single ingredient with multiple ingredients
    // splice out the old one and insert all new ones at that position
    recipe.ingredients = [
      ...recipe.ingredients.slice(0, ingredientIndex),
      ...preparedIngredients,
      ...recipe.ingredients.slice(ingredientIndex + 1),
    ];

    // Check if all ingredients are now parsed
    const hasUnparsed = recipe.ingredients.some((ing: Ingredient) => ing.parsed === false);
    recipe.hasUnparsedIngredients = hasUnparsed;

    return this.recipeRepository.save(recipe);
  }

  /**
   * Fix hasUnparsedIngredients flags for all recipes owned by a user.
   * Recalculates the flag based on actual ingredient data.
   */
  async fixUnparsedFlags(userId: string): Promise<{ fixed: number; total: number }> {
    const recipes = await this.recipeRepository.find({
      where: { ownerId: userId },
    });

    let fixed = 0;

    for (const recipe of recipes) {
      // Calculate actual hasUnparsed status
      const actualHasUnparsed = recipe.ingredients.some(
        (ing: Ingredient) => ing.parsed === false || (!ing.knownIngredientId && ing.parsed !== true)
      );

      // If the flag is wrong, fix it
      if (recipe.hasUnparsedIngredients !== actualHasUnparsed) {
        recipe.hasUnparsedIngredients = actualHasUnparsed;
        await this.recipeRepository.save(recipe);
        fixed++;
        console.log(`Fixed recipe "${recipe.name}": hasUnparsedIngredients = ${actualHasUnparsed}`);
      }
    }

    return { fixed, total: recipes.length };
  }
}
