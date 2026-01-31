import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IngredientDto {
  @IsOptional()
  quantity?: number | string; // Can be number or string for ranges like "3-4"

  @IsOptional()
  @IsString()
  unit?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[]; // Preparation/state modifiers like "chopped", "diced", "frozen"

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  originalText: string;

  @IsOptional()
  @IsString()
  rawLine?: string; // The full original line from the recipe source (for reference when fixing)

  @IsOptional()
  @IsString()
  knownIngredientId?: string;

  @IsOptional()
  @IsString()
  knownUnitId?: string;

  @IsOptional()
  @IsBoolean()
  parsed?: boolean;

  @IsOptional()
  @IsString()
  section?: string; // Section/category this ingredient belongs to (e.g., "Dough", "Filling")
}

export class InstructionDto {
  @IsNumber()
  position: number;

  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateRecipeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  prepTime?: string;

  @IsOptional()
  @IsString()
  cookTime?: string;

  @IsOptional()
  @IsString()
  totalTime?: string;

  @IsOptional()
  @IsNumber()
  servings?: number;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredients?: IngredientDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstructionDto)
  instructions?: InstructionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sharedWith?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  originalMealieUserId?: string;

  @IsOptional()
  @IsBoolean()
  hasUnparsedIngredients?: boolean;
}

export class UpdateRecipeDto extends CreateRecipeDto {}

