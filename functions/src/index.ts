import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();

interface Ingredient {
  quantity?: number;
  unit?: string;
  name: string;
  note?: string;
  originalText: string;
}

interface Instruction {
  position: number;
  text: string;
  title?: string;
}

interface RecipeData {
  name: string;
  description?: string;
  imageUrl?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: number;
  sourceUrl: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
}

/**
 * Import a recipe from a URL using Schema.org/Recipe JSON-LD
 */
export const importFromUrl = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { url } = data;
  if (!url || typeof url !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'URL is required');
  }

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PassTheRecipe/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new functions.https.HttpsError('unavailable', `Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Parse Schema.org recipe data
    const recipe = parseSchemaOrgRecipe(html, url);

    if (!recipe) {
      throw new functions.https.HttpsError(
        'not-found',
        'No recipe data found on this page. The website may not support Schema.org format.'
      );
    }

    return recipe;
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('Import error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to import recipe');
  }
});

function parseSchemaOrgRecipe(html: string, sourceUrl: string): RecipeData | null {
  // Find JSON-LD script tags
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(match[1]);
      const recipe = findRecipeInJsonLd(jsonData);
      if (recipe) {
        return mapSchemaOrgToRecipe(recipe, sourceUrl);
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

function findRecipeInJsonLd(data: any): any {
  if (Array.isArray(data)) {
    for (const item of data) {
      const recipe = findRecipeInJsonLd(item);
      if (recipe) return recipe;
    }
  } else if (data && typeof data === 'object') {
    if (data['@type'] === 'Recipe') {
      return data;
    }
    if (data['@graph']) {
      return findRecipeInJsonLd(data['@graph']);
    }
  }
  return null;
}

function mapSchemaOrgToRecipe(schema: any, sourceUrl: string): RecipeData {
  const ingredients = (schema.recipeIngredient || []).map((ing: string) =>
    parseIngredient(ing)
  );

  let instructions: Instruction[] = [];
  if (schema.recipeInstructions) {
    if (Array.isArray(schema.recipeInstructions)) {
      instructions = schema.recipeInstructions.map((inst: any, index: number) => ({
        position: index,
        text: typeof inst === 'string' ? inst : inst.text || inst.name || ''
      }));
    } else if (typeof schema.recipeInstructions === 'string') {
      instructions = schema.recipeInstructions
        .split(/\n+/)
        .filter((s: string) => s.trim())
        .map((text: string, index: number) => ({
          position: index,
          text: text.trim()
        }));
    }
  }

  return {
    name: schema.name || 'Imported Recipe',
    description: schema.description || '',
    prepTime: formatDuration(schema.prepTime),
    cookTime: formatDuration(schema.cookTime),
    totalTime: formatDuration(schema.totalTime),
    servings: parseServings(schema.recipeYield),
    sourceUrl,
    imageUrl: extractImage(schema.image),
    ingredients,
    instructions,
    tags: schema.keywords ? schema.keywords.split(',').map((k: string) => k.trim()) : []
  };
}

function parseIngredient(text: string): Ingredient {
  const trimmed = text.trim();

  // Common measurement units
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

function formatDuration(duration: string | undefined): string | undefined {
  if (!duration) return undefined;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (match) {
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;

    if (hours && minutes) {
      return `${hours}h ${minutes}m`;
    } else if (hours) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes) {
      return `${minutes} minutes`;
    }
  }

  return duration;
}

function parseServings(yield_: any): number | undefined {
  if (!yield_) return undefined;
  if (typeof yield_ === 'number') return yield_;
  if (typeof yield_ === 'string') {
    const match = yield_.match(/\d+/);
    return match ? parseInt(match[0]) : undefined;
  }
  if (Array.isArray(yield_) && yield_.length > 0) {
    return parseServings(yield_[0]);
  }
  return undefined;
}

function extractImage(image: any): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return extractImage(image[0]);
  if (image.url) return image.url;
  return undefined;
}

