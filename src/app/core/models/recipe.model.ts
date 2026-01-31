export interface Ingredient {
  quantity?: number | string; // Can be number or string for ranges like "3-4"
  unit?: string;
  name: string;
  modifiers?: string[]; // Preparation/state modifiers like "chopped", "diced", "frozen"
  note?: string;
  originalText: string; // The original raw text from the recipe
  rawLine?: string; // The full original line from the recipe source (for reference when fixing)
  knownIngredientId?: string;
  knownUnitId?: string;
  parsed?: boolean; // Whether ingredient was matched to known ingredients
  section?: string; // Section/category this ingredient belongs to (e.g., "Dough", "Filling")
}

export interface Instruction {
  position: number;
  text: string;
  title?: string;
}

export interface Recipe {
  id?: string;
  ownerId: string;
  owner?: {
    id: string;
    displayName: string;
    email: string;
  };
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: number;
  sourceUrl?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
  category?: string;
  isShared: boolean;
  sharedWith: string[];
  originalMealieUserId?: string;
  originalMealieUser?: {
    id: string;
    mealieId: string;
    fullName: string;
    username?: string;
    email?: string;
  };
  hasUnparsedIngredients?: boolean; // True if any ingredient wasn't matched
  createdAt: Date;
  updatedAt: Date;
}
