export type IngredientCategory =
  | 'protein'
  | 'produce'
  | 'dairy'
  | 'pantry'
  | 'spices'
  | 'grains'
  | 'condiments'
  | 'baking'
  | 'frozen'
  | 'beverages'
  | 'other';

export interface KnownIngredient {
  id: string;
  name: string;
  category: IngredientCategory;
  aliases?: string[];
  defaultUnit?: string;
  createdAt: Date;
  updatedAt: Date;
}

