import { KnownIngredient, KnownUnit, KnownModifier } from '../../common/entities';

export interface ParsedIngredient {
  quantity: number | string | null; // Can be number (2), string for ranges ("3-4"), or null
  unit: KnownUnit | null;
  unitText: string | null;
  ingredient: KnownIngredient | null;
  ingredientText: string;
  modifiers: KnownModifier[];
  modifierTexts: string[];
  originalText: string;
  confidence: number;
}

export interface IIngredientParser {
  /**
   * Parse an ingredient string into structured data
   */
  parse(text: string): Promise<ParsedIngredient>;

  /**
   * Get the parser type name for logging
   */
  getParserType(): string;
}

export const INGREDIENT_PARSER = 'INGREDIENT_PARSER';

