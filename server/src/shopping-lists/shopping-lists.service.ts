import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  ShoppingList,
  ShoppingListItem,
  Recipe,
  Ingredient,
} from '../common/entities';

interface CreateShoppingListDto {
  name: string;
  recipeIds?: string[];
}

interface AddItemDto {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
}

@Injectable()
export class ShoppingListsService {
  // Unit normalization map
  private unitMap: Record<string, string> = {
    tsp: 'teaspoon',
    tsps: 'teaspoon',
    teaspoons: 'teaspoon',
    tbsp: 'tablespoon',
    tbsps: 'tablespoon',
    tablespoons: 'tablespoon',
    c: 'cup',
    cups: 'cup',
    oz: 'ounce',
    ounces: 'ounce',
    lb: 'pound',
    lbs: 'pound',
    pounds: 'pound',
    g: 'gram',
    grams: 'gram',
    kg: 'kilogram',
    kilograms: 'kilogram',
    ml: 'milliliter',
    milliliters: 'milliliter',
    l: 'liter',
    liters: 'liter',
  };

  constructor(
    @InjectRepository(ShoppingList)
    private shoppingListRepository: Repository<ShoppingList>,
    @InjectRepository(ShoppingListItem)
    private shoppingListItemRepository: Repository<ShoppingListItem>,
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
  ) {}

  /**
   * Normalize a unit string
   */
  private normalizeUnit(unit: string | undefined | null): string | null {
    if (!unit) return null;
    const lower = unit.toLowerCase().trim();
    return this.unitMap[lower] || lower;
  }

  /**
   * Normalize an ingredient name for matching
   */
  private normalizeIngredientName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Aggregate ingredients from multiple recipes
   * Uses knownIngredientId for better matching when available
   */
  private aggregateIngredients(
    recipes: Recipe[],
  ): Array<{ name: string; quantity: number | null; unit: string | null; note: string | null; knownIngredientId: string | null }> {
    const aggregated = new Map<
      string,
      { 
        name: string; 
        quantity: number | string | null; // Can be string for ranges like "3-4"
        unit: string | null; 
        notes: string[];
        knownIngredientId: string | null;
      }
    >();

    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients || []) {
        // Prefer knownIngredientId for grouping, fall back to normalized name
        let key: string;
        if (ingredient.knownIngredientId) {
          // Group by knownIngredientId + normalized unit
          const normalizedUnit = this.normalizeUnit(ingredient.unit);
          key = `known:${ingredient.knownIngredientId}|${normalizedUnit || 'none'}`;
        } else {
          // Fall back to text-based matching
          const normalizedName = this.normalizeIngredientName(ingredient.name);
          const normalizedUnit = this.normalizeUnit(ingredient.unit);
          key = `text:${normalizedName}|${normalizedUnit || 'none'}`;
        }

        if (aggregated.has(key)) {
          const existing = aggregated.get(key)!;
          // Handle quantity aggregation - only add if both are numbers
          if (existing.quantity !== null && ingredient.quantity !== undefined) {
            const existingNum = typeof existing.quantity === 'number' ? existing.quantity : null;
            const newNum = typeof ingredient.quantity === 'number' ? ingredient.quantity : null;
            if (existingNum !== null && newNum !== null) {
              existing.quantity = existingNum + newNum;
            }
            // If either is a range string, keep existing (don't try to add)
          }
          if (ingredient.note && !existing.notes.includes(ingredient.note)) {
            existing.notes.push(ingredient.note);
          }
        } else {
          // Convert quantity to number if possible, keep as string for ranges
          let qty: number | string | null = null;
          if (ingredient.quantity !== undefined) {
            qty = typeof ingredient.quantity === 'number' 
              ? ingredient.quantity 
              : ingredient.quantity; // Keep range strings as-is
          }
          aggregated.set(key, {
            name: ingredient.name, // Keep original capitalization
            quantity: qty,
            unit: ingredient.unit || null,
            notes: ingredient.note ? [ingredient.note] : [],
            knownIngredientId: ingredient.knownIngredientId || null,
          });
        }
      }
    }

    return Array.from(aggregated.values()).map((item) => ({
      name: item.name,
      quantity: this.quantityToNumber(item.quantity),
      unit: item.unit,
      note: item.notes.length > 0 ? item.notes.join('; ') : null,
      knownIngredientId: item.knownIngredientId,
    }));
  }

  /**
   * Convert quantity to number (handles range strings like "3-4")
   */
  private quantityToNumber(qty: number | string | null): number | null {
    if (qty === null || qty === undefined) return null;
    if (typeof qty === 'number') return qty;
    // Handle range strings like "3-4" - use the first number
    const match = String(qty).match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Create a new shopping list
   */
  async create(
    userId: string,
    dto: CreateShoppingListDto,
  ): Promise<ShoppingList> {
    // Fetch recipes if provided
    let recipes: Recipe[] = [];
    if (dto.recipeIds && dto.recipeIds.length > 0) {
      recipes = await this.recipeRepository.find({
        where: { id: In(dto.recipeIds) },
      });
    }

    // Create the shopping list
    const shoppingList = this.shoppingListRepository.create({
      name: dto.name,
      ownerId: userId,
      recipes: recipes,
      items: [],
    });

    // Save first to get the ID
    const savedList = await this.shoppingListRepository.save(shoppingList);

    // Aggregate ingredients and create items
    if (recipes.length > 0) {
      const aggregatedIngredients = this.aggregateIngredients(recipes);
      const items = aggregatedIngredients.map((ing, index) =>
        this.shoppingListItemRepository.create({
          shoppingListId: savedList.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          note: ing.note,
          position: index,
          isChecked: false,
          knownIngredientId: ing.knownIngredientId,
        }),
      );

      await this.shoppingListItemRepository.save(items);
    }

    // Return the complete list
    return this.findOne(savedList.id, userId);
  }

  /**
   * Get all shopping lists for a user
   */
  async findAll(userId: string): Promise<ShoppingList[]> {
    return this.shoppingListRepository.find({
      where: { ownerId: userId },
      relations: ['items', 'recipes'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single shopping list
   */
  async findOne(id: string, userId: string): Promise<ShoppingList> {
    const list = await this.shoppingListRepository.findOne({
      where: { id },
      relations: ['items', 'recipes'],
    });

    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    if (list.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to view this shopping list');
    }

    // Sort items by position
    list.items = list.items.sort((a, b) => a.position - b.position);

    return list;
  }

  /**
   * Add recipes to an existing shopping list
   * Consolidates ingredients with existing items when possible
   */
  async addRecipes(
    listId: string,
    userId: string,
    recipeIds: string[],
  ): Promise<ShoppingList> {
    const list = await this.findOne(listId, userId);

    // Fetch new recipes
    const newRecipes = await this.recipeRepository.find({
      where: { id: In(recipeIds) },
    });

    if (newRecipes.length === 0) {
      throw new NotFoundException('No recipes found');
    }

    // Add to recipes list (avoiding duplicates)
    const existingRecipeIds = list.recipes.map((r) => r.id);
    const recipesToAdd = newRecipes.filter(
      (r) => !existingRecipeIds.includes(r.id),
    );

    // Aggregate new ingredients from the recipes being added
    const aggregatedIngredients = this.aggregateIngredients(recipesToAdd);
    
    // Build a map of existing items for quick lookup
    const existingItemsMap = new Map<string, ShoppingListItem>();
    for (const item of list.items) {
      const key = this.getItemKey(item);
      existingItemsMap.set(key, item);
    }

    const itemsToUpdate: ShoppingListItem[] = [];
    const itemsToCreate: ShoppingListItem[] = [];
    let maxPosition = Math.max(...list.items.map((i) => i.position), -1);

    for (const ing of aggregatedIngredients) {
      const key = this.getIngredientKey(ing);
      const existingItem = existingItemsMap.get(key);

      if (existingItem) {
        // Merge with existing item - add quantities if both are numbers
        if (existingItem.quantity !== null && ing.quantity !== null) {
          const existingQty = typeof existingItem.quantity === 'number' ? existingItem.quantity : null;
          const newQty = typeof ing.quantity === 'number' ? ing.quantity : null;
          if (existingQty !== null && newQty !== null) {
            existingItem.quantity = existingQty + newQty;
          }
        } else if (ing.quantity !== null) {
          existingItem.quantity = ing.quantity;
        }
        // Add note if new
        if (ing.note && (!existingItem.note || !existingItem.note.includes(ing.note))) {
          existingItem.note = existingItem.note 
            ? `${existingItem.note}; ${ing.note}` 
            : ing.note;
        }
        // Uncheck the item since we're adding more
        existingItem.isChecked = false;
        itemsToUpdate.push(existingItem);
      } else {
        // Create new item
        maxPosition++;
        const item = new ShoppingListItem();
        item.shoppingListId = listId;
        item.name = ing.name;
        item.quantity = ing.quantity;
        item.unit = ing.unit;
        item.note = ing.note;
        item.position = maxPosition;
        item.isChecked = false;
        item.knownIngredientId = ing.knownIngredientId;
        itemsToCreate.push(item);
      }
    }

    // Save updated and new items
    if (itemsToUpdate.length > 0) {
      await this.shoppingListItemRepository.save(itemsToUpdate);
    }
    if (itemsToCreate.length > 0) {
      await this.shoppingListItemRepository.save(itemsToCreate);
    }
    
    // Update recipes relationship separately (avoid cascade issues with items)
    if (recipesToAdd.length > 0) {
      await this.shoppingListRepository
        .createQueryBuilder()
        .relation(ShoppingList, 'recipes')
        .of(listId)
        .add(recipesToAdd.map(r => r.id));
    }

    return this.findOne(listId, userId);
  }

  /**
   * Generate a key for an existing shopping list item for deduplication
   */
  private getItemKey(item: ShoppingListItem): string {
    if (item.knownIngredientId) {
      const normalizedUnit = this.normalizeUnit(item.unit);
      return `known:${item.knownIngredientId}|${normalizedUnit || 'none'}`;
    }
    const normalizedName = this.normalizeIngredientName(item.name);
    const normalizedUnit = this.normalizeUnit(item.unit);
    return `text:${normalizedName}|${normalizedUnit || 'none'}`;
  }

  /**
   * Generate a key for an aggregated ingredient for deduplication
   */
  private getIngredientKey(ing: { name: string; unit: string | null; knownIngredientId: string | null }): string {
    if (ing.knownIngredientId) {
      const normalizedUnit = this.normalizeUnit(ing.unit);
      return `known:${ing.knownIngredientId}|${normalizedUnit || 'none'}`;
    }
    const normalizedName = this.normalizeIngredientName(ing.name);
    const normalizedUnit = this.normalizeUnit(ing.unit);
    return `text:${normalizedName}|${normalizedUnit || 'none'}`;
  }

  /**
   * Toggle an item's checked status
   */
  async toggleItem(
    listId: string,
    itemId: string,
    userId: string,
  ): Promise<ShoppingListItem> {
    // Verify ownership
    await this.findOne(listId, userId);

    const item = await this.shoppingListItemRepository.findOne({
      where: { id: itemId, shoppingListId: listId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    item.isChecked = !item.isChecked;
    return this.shoppingListItemRepository.save(item);
  }

  /**
   * Add a manual item to the list
   */
  async addItem(
    listId: string,
    userId: string,
    dto: AddItemDto,
  ): Promise<ShoppingListItem> {
    const list = await this.findOne(listId, userId);

    const maxPosition = Math.max(...list.items.map((i) => i.position), -1);

    const item = this.shoppingListItemRepository.create({
      shoppingListId: listId,
      name: dto.name,
      quantity: dto.quantity || null,
      unit: dto.unit || null,
      note: dto.note || null,
      position: maxPosition + 1,
      isChecked: false,
    });

    return this.shoppingListItemRepository.save(item);
  }

  /**
   * Remove an item from the list
   */
  async removeItem(
    listId: string,
    itemId: string,
    userId: string,
  ): Promise<void> {
    // Verify ownership
    await this.findOne(listId, userId);

    const item = await this.shoppingListItemRepository.findOne({
      where: { id: itemId, shoppingListId: listId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    await this.shoppingListItemRepository.remove(item);
  }

  /**
   * Update item details
   */
  async updateItem(
    listId: string,
    itemId: string,
    userId: string,
    dto: Partial<AddItemDto>,
  ): Promise<ShoppingListItem> {
    // Verify ownership
    await this.findOne(listId, userId);

    const item = await this.shoppingListItemRepository.findOne({
      where: { id: itemId, shoppingListId: listId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.note !== undefined) item.note = dto.note;

    return this.shoppingListItemRepository.save(item);
  }

  /**
   * Mark list as complete/incomplete
   */
  async toggleComplete(listId: string, userId: string): Promise<ShoppingList> {
    const list = await this.findOne(listId, userId);
    list.isComplete = !list.isComplete;
    await this.shoppingListRepository.save(list);
    return this.findOne(listId, userId);
  }

  /**
   * Delete a shopping list
   */
  async delete(id: string, userId: string): Promise<void> {
    const list = await this.findOne(id, userId);
    await this.shoppingListRepository.remove(list);
  }

  /**
   * Clear all checked items from a list
   */
  async clearChecked(listId: string, userId: string): Promise<ShoppingList> {
    const list = await this.findOne(listId, userId);

    const checkedItems = list.items.filter((item) => item.isChecked);
    if (checkedItems.length > 0) {
      await this.shoppingListItemRepository.remove(checkedItems);
    }

    return this.findOne(listId, userId);
  }
}

