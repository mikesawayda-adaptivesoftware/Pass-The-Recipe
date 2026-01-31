import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Recipe, Ingredient } from '../models';

export interface MealieImportIngredient {
  display: string;
  quantity?: number;
  unit?: string;
  food?: string;
  note?: string;
  section?: string; // Section this ingredient belongs to (e.g., "Dough", "Filling")
}

export interface MealieImportInstruction {
  id?: string;
  title?: string;
  text: string;
}

export interface MealieImportRecipe {
  id?: string;
  name: string;
  description?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: number;
  sourceUrl?: string;
  ingredients: MealieImportIngredient[];
  instructions: MealieImportInstruction[];
  tags?: string[];
  originalMealieUserId?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface MealieImportResult {
  imported: number;
  failed: number;
  recipes: Recipe[];
  errors: { name: string; error: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private http = inject(HttpClient);

  async createRecipe(recipeData: Partial<Recipe>, imageFile?: File): Promise<Recipe> {
    const recipe = await this.http.post<Recipe>(`${environment.apiUrl}/recipes`, recipeData).toPromise();

    if (imageFile && recipe?.id) {
      return this.uploadImage(recipe.id, imageFile);
    }

    return recipe!;
  }

  async updateRecipe(id: string, recipeData: Partial<Recipe>, imageFile?: File): Promise<Recipe> {
    const recipe = await this.http.put<Recipe>(`${environment.apiUrl}/recipes/${id}`, recipeData).toPromise();

    if (imageFile && recipe?.id) {
      return this.uploadImage(recipe.id, imageFile);
    }

    return recipe!;
  }

  async deleteRecipe(id: string): Promise<void> {
    await this.http.delete(`${environment.apiUrl}/recipes/${id}`).toPromise();
  }

  async getRecipe(id: string): Promise<Recipe | null> {
    try {
      const recipe = await this.http.get<Recipe>(`${environment.apiUrl}/recipes/${id}`).toPromise();
      return recipe || null;
    } catch {
      return null;
    }
  }

  async getMyRecipes(): Promise<Recipe[]> {
    const recipes = await this.http.get<Recipe[]>(`${environment.apiUrl}/recipes`).toPromise();
    return recipes || [];
  }

  async getSharedRecipes(): Promise<Recipe[]> {
    const recipes = await this.http.get<Recipe[]>(`${environment.apiUrl}/recipes/shared`).toPromise();
    return recipes || [];
  }

  async uploadImage(recipeId: string, file: File): Promise<Recipe> {
    const formData = new FormData();
    formData.append('image', file);

    const recipe = await this.http.post<Recipe>(
      `${environment.apiUrl}/recipes/${recipeId}/image`,
      formData
    ).toPromise();

    return recipe!;
  }

  async importFromMealie(recipes: MealieImportRecipe[]): Promise<MealieImportResult> {
    const url = `${environment.apiUrl}/import/mealie`;
    console.log(`[RecipeService] importFromMealie called with ${recipes.length} recipes`);
    console.log(`[RecipeService] POST ${url}`);
    
    const result = await this.http.post<MealieImportResult>(
      url,
      { recipes }
    ).toPromise();
    
    console.log(`[RecipeService] Import result:`, result);
    return result!;
  }

  async getUnparsedRecipes(): Promise<Recipe[]> {
    const recipes = await this.http.get<Recipe[]>(`${environment.apiUrl}/recipes/unparsed`).toPromise();
    return recipes || [];
  }

  async migrateRecipes(): Promise<{ updated: number }> {
    const result = await this.http.post<{ updated: number }>(`${environment.apiUrl}/recipes/migrate`, {}).toPromise();
    return result || { updated: 0 };
  }

  async updateIngredient(recipeId: string, ingredientIndex: number, ingredient: Partial<Ingredient>): Promise<Recipe> {
    const result = await this.http.put<Recipe>(
      `${environment.apiUrl}/recipes/${recipeId}/ingredients/${ingredientIndex}`,
      ingredient
    ).toPromise();
    return result!;
  }

  async splitIngredient(recipeId: string, ingredientIndex: number, ingredients: Partial<Ingredient>[]): Promise<Recipe> {
    const result = await this.http.post<Recipe>(
      `${environment.apiUrl}/recipes/${recipeId}/ingredients/${ingredientIndex}/split`,
      { ingredients }
    ).toPromise();
    return result!;
  }

  async parseIngredientWithLLM(text: string): Promise<any> {
    const result = await this.http.post<any>(`${environment.apiUrl}/ingredients/parse`, { text }).toPromise();
    return result;
  }

  async getFavorites(): Promise<Recipe[]> {
    const recipes = await this.http.get<Recipe[]>(`${environment.apiUrl}/users/favorites`).toPromise();
    return recipes || [];
  }

  async addFavorite(recipeId: string): Promise<{ success: boolean }> {
    const result = await this.http.post<{ success: boolean }>(
      `${environment.apiUrl}/users/favorites/${recipeId}`,
      {}
    ).toPromise();
    return result || { success: false };
  }

  async removeFavorite(recipeId: string): Promise<{ success: boolean }> {
    const result = await this.http.delete<{ success: boolean }>(
      `${environment.apiUrl}/users/favorites/${recipeId}`
    ).toPromise();
    return result || { success: false };
  }

  async isFavorite(recipeId: string): Promise<boolean> {
    try {
      const result = await this.http.get<{ isFavorite: boolean }>(
        `${environment.apiUrl}/users/favorites/${recipeId}`
      ).toPromise();
      return result?.isFavorite || false;
    } catch {
      return false;
    }
  }

  parseIngredient(text: string): Ingredient {
    const trimmed = text.trim();

    const unitPatterns = [
      'cups?', 'c\\.?', 'tablespoons?', 'tbsp?\\.?', 'teaspoons?', 'tsp?\\.?',
      'ounces?', 'oz\\.?', 'pounds?', 'lbs?\\.?', 'grams?', 'g\\.?',
      'kilograms?', 'kg\\.?', 'milliliters?', 'ml\\.?', 'liters?', 'l\\.?',
      'pinch(?:es)?', 'dash(?:es)?', 'cloves?', 'heads?', 'bunches?',
      'slices?', 'pieces?', 'cans?', 'packages?', 'sticks?'
    ].join('|');

    const regex = new RegExp(
      `^([\\d\\s\\/\\.]+)?\\s*(${unitPatterns})?\\s*(.+)$`,
      'i'
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
            return sum + (num / den);
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
        note = note ? `${note}, ${name.substring(commaIndex + 1).trim()}` : name.substring(commaIndex + 1).trim();
        name = name.substring(0, commaIndex).trim();
      }

      return {
        quantity,
        unit,
        name,
        note,
        originalText: trimmed
      };
    }

    return {
      name: trimmed,
      originalText: trimmed
    };
  }
}
