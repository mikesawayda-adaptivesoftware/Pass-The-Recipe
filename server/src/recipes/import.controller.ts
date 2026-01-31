import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecipesService } from './recipes.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface ImportFromUrlDto {
  url: string;
}

interface MealieIngredientDto {
  display: string;
  quantity?: number;
  unit?: string;
  food?: string;
  note?: string;
  section?: string; // Section this ingredient belongs to (e.g., "Dough", "Filling")
}

interface MealieInstructionDto {
  id?: string;
  title?: string;
  text: string;
}

interface MealieRecipeDto {
  id?: string;
  name: string;
  description?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: number;
  sourceUrl?: string;
  ingredients: MealieIngredientDto[];
  instructions: MealieInstructionDto[];
  tags?: string[];
  originalMealieUserId?: string;
  imageBase64?: string; // Base64 encoded image data
  imageMimeType?: string; // e.g., 'image/webp'
}

interface ImportFromMealieDto {
  recipes: MealieRecipeDto[];
}

@Controller('api/import')
@UseGuards(AuthGuard('jwt'))
export class ImportController {
  constructor(
    private recipesService: RecipesService,
    private ingredientsService: IngredientsService,
  ) {}

  /**
   * Preview endpoint - returns all ingredients that would be sent to the parser
   * without actually parsing them. Use this to sanity check the data.
   */
  @Post('mealie/preview')
  async previewMealieImport(@Request() req, @Body() dto: ImportFromMealieDto) {
    if (!dto.recipes || !Array.isArray(dto.recipes)) {
      throw new BadRequestException('Recipes array is required');
    }

    const preview = dto.recipes.map(recipe => {
      const ingredientTexts = recipe.ingredients
        .map(ing => (ing as any).original_text || ing.display || '')
        .filter(Boolean);
      
      return {
        recipeName: recipe.name,
        ingredientCount: ingredientTexts.length,
        ingredients: ingredientTexts,
      };
    });

    const totalIngredients = preview.reduce((sum, r) => sum + r.ingredientCount, 0);

    return {
      totalRecipes: preview.length,
      totalIngredients,
      recipes: preview,
    };
  }

  @Post('mealie')
  async importFromMealie(@Request() req, @Body() dto: ImportFromMealieDto) {
    if (!dto.recipes || !Array.isArray(dto.recipes) || dto.recipes.length === 0) {
      throw new BadRequestException('At least one recipe is required');
    }

    const results: any[] = [];
    const updated: any[] = []; // Track recipes that were updated (re-imported)
    const errors: { name: string; error: string }[] = [];
    const skipped: { name: string; reason: string }[] = [];
    const importedNames = new Set<string>(); // Track names imported in this batch
    const recipesWithFailedIngredients: { 
      recipeName: string; 
      recipeId?: string;
      failedIngredients: {
        originalText: string;
        parsedIngredient: string;
        parsedQuantity: string | number | null;
        parsedUnit: string | null;
        unitMatched: boolean;
        reason: string;
      }[];
      totalIngredients: number;
    }[] = [];

    console.log(`\n=== MEALIE IMPORT: ${dto.recipes.length} recipes ===\n`);

    for (const mealieRecipe of dto.recipes) {
      try {
        console.log(`Processing: ${mealieRecipe.name}`);

        // Check for duplicate in this import batch
        if (importedNames.has(mealieRecipe.name.toLowerCase())) {
          console.log(`  ⏭️ Skipped: duplicate in import batch\n`);
          skipped.push({ name: mealieRecipe.name, reason: 'Duplicate in import batch' });
          continue;
        }

        // Check if recipe with same name already exists for this user
        const existingRecipe = await this.recipesService.findByName(req.user.id, mealieRecipe.name);
        let isUpdate = false;
        if (existingRecipe) {
          // Check if any ingredients are unparsed (parsed === false or no knownIngredientId)
          const hasAnyUnparsed = existingRecipe.ingredients?.some(
            ing => ing.parsed === false || !ing.knownIngredientId
          );
          
          if (hasAnyUnparsed) {
            console.log(`  🔄 Recipe exists with unparsed ingredients - will update (ID: ${existingRecipe.id})`);
            isUpdate = true;
          } else {
            console.log(`  ⏭️ Skipped: recipe already exists with all ingredients parsed (ID: ${existingRecipe.id})\n`);
            skipped.push({ name: mealieRecipe.name, reason: 'Recipe already exists with all ingredients parsed' });
            continue;
          }
        }

        // Parse ingredients using our ingredient parser (sequential to avoid rate limits)
        // Preserve section info from Mealie throughout the process
        const rawIngredientItems = mealieRecipe.ingredients.map(ing => ({
          text: (ing as any).original_text || ing.display || '',
          section: ing.section, // Preserve section from Mealie import
        })).filter(item => item.text);
        
        // Filter out ONLY things that are clearly NOT ingredients
        // Be conservative - let questionable items through for user to fix later
        const ingredientItems = rawIngredientItems.filter(item => {
          const lower = item.text.toLowerCase().trim();
          
          // Skip section headers (lines that are just dashes, asterisks, or labels like "---SAUCE---")
          if (/^[\-\*\_\s]+$/.test(lower) || /^[\-\*\_]+\s*\w+\s*[\-\*\_]+$/.test(lower)) {
            console.log(`  ⏭️ Skipping section header: "${item.text}"`);
            return false;
          }
          
          // Skip single modifiers/words that aren't ingredients (exact matches only)
          const modifierOnlyPatterns = [
            'uncooked', 'shredded', 'dried', 'large', 'small', 'medium',
            'finely chopped', 'chopped', 'diced', 'minced', 'low sodium',
            'fresh', 'frozen', 'canned', 'sliced', 'other', 'optional',
            'garnish', 'for garnish', 'for serving', 'to taste'
          ];
          if (modifierOnlyPatterns.includes(lower)) {
            console.log(`  ⏭️ Skipping standalone word: "${item.text}"`);
            return false;
          }
          
          // Skip measurement-only text (just numbers and units, no ingredient)
          if (/^[\d\/\.\s\-to]+(cup|tbsp|tsp|oz|lb|g|ml|pound|ounce)s?\*?$/i.test(lower)) {
            console.log(`  ⏭️ Skipping measurement-only: "${item.text}"`);
            return false;
          }
          
          return true;
        });
        
        console.log(`  Parsing ${ingredientItems.length} ingredients (skipped ${rawIngredientItems.length - ingredientItems.length} non-ingredients)...`);

        const parsedIngredients: Array<Awaited<ReturnType<typeof this.ingredientsService.parseIngredient>> & { section?: string }> = [];
        const parserType = this.ingredientsService.getParserType();
        const needsDelay = parserType === 'llm'; // Only delay for LLM parser (rate limits)
        
        for (const item of ingredientItems) {
          const parsed = await this.ingredientsService.parseIngredient(item.text);
          parsedIngredients.push({ ...parsed, section: item.section }); // Attach section info
          
          // Only delay for LLM parser to avoid rate limits
          if (needsDelay) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Log parsing results and track failures
        const failedIngredients: {
          originalText: string;
          parsedIngredient: string;
          parsedQuantity: string | number | null;
          parsedUnit: string | null;
          unitMatched: boolean;
          reason: string;
        }[] = [];
        
        parsedIngredients.forEach((parsed) => {
          const matched = parsed.ingredient ? '✅' : '❌';
          const unitMatched = parsed.unit ? '✅' : '⚪';
          console.log(`  ${matched} "${parsed.originalText}"`);
          console.log(`     → Ingredient: ${parsed.ingredient?.name || parsed.ingredientText} ${parsed.ingredient ? `(ID: ${parsed.ingredient.id.slice(0, 8)}...)` : '(no match)'}`);
          console.log(`     → Quantity: ${parsed.quantity || 'none'}, Unit: ${parsed.unit?.name || parsed.unitText || 'none'} ${unitMatched}`);
          if (parsed.modifierTexts.length > 0) {
            console.log(`     → Modifiers: ${parsed.modifierTexts.join(', ')}`);
          }
          // Track failed ingredients (no known ingredient match)
          if (!parsed.ingredient) {
            failedIngredients.push({
              originalText: parsed.originalText,
              parsedIngredient: parsed.ingredientText,
              parsedQuantity: parsed.quantity,
              parsedUnit: parsed.unit?.name || parsed.unitText || null,
              unitMatched: !!parsed.unit,
              reason: `No match for ingredient "${parsed.ingredientText}" in known ingredients database`,
            });
          }
        });

        // Determine if recipe has unparsed ingredients
        const hasUnparsedIngredients = failedIngredients.length > 0;
        
        if (hasUnparsedIngredients) {
          console.log(`  ⚠️ ${failedIngredients.length} ingredient(s) couldn't be matched (will import anyway)`);
          recipesWithFailedIngredients.push({
            recipeName: mealieRecipe.name,
            recipeId: undefined, // Will be set after creation
            failedIngredients,
            totalIngredients: parsedIngredients.length,
          });
        }

        // Convert parsed ingredients to recipe format
        // Mark each ingredient with parsed: true/false based on whether it matched
        // Preserve section info from Mealie import
        const ingredients = parsedIngredients.map((parsed) => ({
          name: parsed.ingredient?.name || parsed.ingredientText,
          quantity: parsed.quantity ?? undefined, // Convert null to undefined
          unit: parsed.unit?.name || parsed.unitText || undefined,
          modifiers: parsed.modifierTexts.length > 0 ? parsed.modifierTexts : undefined,
          note: undefined, // Let modifiers handle this instead of note
          originalText: parsed.originalText,
          rawLine: parsed.originalText, // Store original line for reference when fixing
          knownIngredientId: parsed.ingredient?.id,
          knownUnitId: parsed.unit?.id,
          parsed: !!parsed.ingredient, // true if matched to known ingredient, false otherwise
          section: parsed.section, // Section from Mealie (e.g., "Dough", "Filling")
        }));

        // Process instructions
        const instructions = mealieRecipe.instructions
          .filter(inst => inst.text && inst.text.trim())
          .map((inst, index) => ({
            position: index,
            text: inst.text.trim(),
            title: inst.title,
          }));

        // Handle image if provided
        let imageUrl: string | undefined;
        if (mealieRecipe.imageBase64 && mealieRecipe.imageMimeType) {
          try {
            imageUrl = await this.saveBase64Image(mealieRecipe.imageBase64, mealieRecipe.imageMimeType);
            console.log(`  ✓ Image saved: ${imageUrl}`);
          } catch (imgError) {
            console.warn(`  ✗ Failed to save image: ${imgError.message}`);
          }
        }

        // Create or update the recipe
        const recipeData = {
          name: mealieRecipe.name,
          description: mealieRecipe.description || '',
          prepTime: mealieRecipe.prepTime,
          cookTime: mealieRecipe.cookTime,
          totalTime: mealieRecipe.totalTime,
          servings: mealieRecipe.servings,
          sourceUrl: mealieRecipe.sourceUrl,
          imageUrl,
          ingredients,
          instructions,
          tags: mealieRecipe.tags || [],
          isShared: false,
          sharedWith: [],
          originalMealieUserId: mealieRecipe.originalMealieUserId,
          hasUnparsedIngredients,
        };

        let savedRecipe;
        if (isUpdate && existingRecipe) {
          // Update existing recipe with new ingredient parsing
          savedRecipe = await this.recipesService.update(existingRecipe.id, req.user.id, recipeData);
          updated.push(savedRecipe);
          console.log(`  🔄 Updated recipe: ${savedRecipe.id}`);
        } else {
          // Create new recipe
          savedRecipe = await this.recipesService.create(req.user.id, recipeData);
          results.push(savedRecipe);
          console.log(`  ✓ Created recipe: ${savedRecipe.id}`);
        }
        importedNames.add(mealieRecipe.name.toLowerCase()); // Track for duplicate detection
        
        // Update the recipe ID in the failed ingredients tracking
        if (hasUnparsedIngredients) {
          const lastEntry = recipesWithFailedIngredients[recipesWithFailedIngredients.length - 1];
          if (lastEntry && lastEntry.recipeName === mealieRecipe.name) {
            lastEntry.recipeId = savedRecipe.id;
          }
        }
        
        if (hasUnparsedIngredients) {
          console.log(`  ⚠️ Recipe has unparsed ingredients\n`);
        } else {
          console.log(`\n`);
        }
      } catch (error) {
        console.error(`  ✗ Failed to import "${mealieRecipe.name}": ${error.message}\n`);
        errors.push({ name: mealieRecipe.name, error: error.message });
      }
    }

    const totalFailedIngredients = recipesWithFailedIngredients.reduce((sum, r) => sum + r.failedIngredients.length, 0);
    console.log(`=== MEALIE IMPORT COMPLETE: ${results.length} imported, ${updated.length} updated, ${skipped.length} skipped, ${errors.length} failed ===`);
    console.log(`=== ${recipesWithFailedIngredients.length} recipes had ${totalFailedIngredients} unmatched ingredients ===\n`);

    return {
      imported: results.length,
      updated: updated.length,
      skipped: skipped.length,
      failed: errors.length,
      recipesWithParsingIssues: recipesWithFailedIngredients.length,
      recipes: results,
      updatedRecipes: updated,
      skippedRecipes: skipped,
      errors,
      recipesWithFailedIngredients,
    };
  }

  private async saveBase64Image(base64Data: string, mimeType: string): Promise<string> {
    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Determine file extension from mime type
    let extension = '.jpg';
    if (mimeType.includes('png')) extension = '.png';
    else if (mimeType.includes('webp')) extension = '.webp';
    else if (mimeType.includes('gif')) extension = '.gif';

    // Generate unique filename
    const filename = `mealie-${randomUUID()}${extension}`;
    const filepath = join(uploadsDir, filename);

    // Decode and save
    const buffer = Buffer.from(base64Data, 'base64');
    await writeFile(filepath, buffer);

    return `/uploads/${filename}`;
  }

  /**
   * Preview URL import - fetches and parses the recipe without saving
   * Returns the recipe data with parsed ingredient texts for review
   */
  @Post('url/preview')
  async previewUrlImport(@Request() req, @Body() dto: ImportFromUrlDto) {
    if (!dto.url) {
      throw new BadRequestException('URL is required');
    }

    try {
      const response = await fetch(dto.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new BadRequestException(
          `Failed to fetch URL: ${response.status} ${response.statusText}`,
        );
      }

      const html = await response.text();
      const recipeData = await this.parseSchemaOrgRecipe(html, dto.url);

      if (!recipeData) {
        throw new BadRequestException(
          'No recipe data found on this page. The site may not support Schema.org/Recipe format.',
        );
      }

      // Return the recipe data without saving
      // Extract ingredient texts for the frontend review dialog
      const ingredientTexts = (recipeData.ingredients || []).map((ing: any) => 
        ing.originalText || ing.name || ''
      ).filter(Boolean);

      return {
        recipe: {
          name: recipeData.name,
          description: recipeData.description,
          prepTime: recipeData.prepTime,
          cookTime: recipeData.cookTime,
          totalTime: recipeData.totalTime,
          servings: recipeData.servings,
          sourceUrl: recipeData.sourceUrl,
          imageUrl: recipeData.imageUrl, // External URL for preview
          instructions: recipeData.instructions,
          tags: recipeData.tags,
        },
        ingredientTexts,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      console.error('Preview error:', error);
      throw new InternalServerErrorException(
        `Failed to preview recipe: ${error.message}`,
      );
    }
  }

  @Post('url')
  async importFromUrl(@Request() req, @Body() dto: ImportFromUrlDto) {
    if (!dto.url) {
      throw new BadRequestException('URL is required');
    }

    try {
      // Use a more realistic browser User-Agent
      const response = await fetch(dto.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new BadRequestException(
          `Failed to fetch URL: ${response.status} ${response.statusText}`,
        );
      }

      const html = await response.text();
      const recipeData = await this.parseSchemaOrgRecipe(html, dto.url);

      if (!recipeData) {
        throw new BadRequestException(
          'No recipe data found on this page. The site may not support Schema.org/Recipe format.',
        );
      }

      // Download the image if available
      if (recipeData.imageUrl) {
        try {
          console.log('Attempting to download image:', recipeData.imageUrl);
          const localImagePath = await this.downloadImage(recipeData.imageUrl, dto.url);
          if (localImagePath) {
            recipeData.imageUrl = localImagePath;
            console.log('Image saved as:', localImagePath);
          } else {
            console.warn('Image download returned null');
            delete recipeData.imageUrl;
          }
        } catch (imageError) {
          console.warn('Failed to download recipe image:', imageError.message);
          // Continue without the image - don't fail the whole import
          delete recipeData.imageUrl;
        }
      } else {
        console.log('No image URL found in recipe data');
      }

      // Create the recipe
      return this.recipesService.create(req.user.id, recipeData);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      console.error('Import error:', error);
      throw new InternalServerErrorException(
        `Failed to import recipe: ${error.message}`,
      );
    }
  }

  private async parseSchemaOrgRecipe(html: string, sourceUrl: string): Promise<any> {
    // Find all JSON-LD script tags
    const jsonLdRegex =
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    // Also extract og:image as fallback
    const ogImage = this.extractOgImage(html);
    console.log('Found og:image fallback:', ogImage);

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        // Clean up the JSON (remove HTML entities, etc.)
        let jsonString = match[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();

        const jsonData = JSON.parse(jsonString);
        const recipe = this.findRecipeInJsonLd(jsonData);
        if (recipe) {
          return await this.mapSchemaOrgToRecipe(recipe, sourceUrl, ogImage);
        }
      } catch (e) {
        // Continue to next script tag if JSON parsing fails
        console.log('JSON-LD parse error, trying next:', e.message);
        continue;
      }
    }

    return null;
  }

  private extractOgImage(html: string): string | undefined {
    // Try og:image first (most common)
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImageMatch) {
      return ogImageMatch[1];
    }

    // Try alternate format where content comes before property
    const ogImageAltMatch = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageAltMatch) {
      return ogImageAltMatch[1];
    }

    // Try twitter:image as another fallback
    const twitterImageMatch = html.match(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (twitterImageMatch) {
      return twitterImageMatch[1];
    }

    // Try twitter:image alternate format
    const twitterImageAltMatch = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:image["']/i);
    if (twitterImageAltMatch) {
      return twitterImageAltMatch[1];
    }

    return undefined;
  }

  private findRecipeInJsonLd(data: any): any {
    if (Array.isArray(data)) {
      for (const item of data) {
        const recipe = this.findRecipeInJsonLd(item);
        if (recipe) return recipe;
      }
    } else if (data && typeof data === 'object') {
      // Check if @type is Recipe (can be string or array)
      const type = data['@type'];
      if (type) {
        const isRecipe =
          type === 'Recipe' ||
          (Array.isArray(type) && type.includes('Recipe'));
        if (isRecipe) {
          return data;
        }
      }

      // Check @graph for nested data
      if (data['@graph']) {
        return this.findRecipeInJsonLd(data['@graph']);
      }

      // Check other nested objects
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'object' && data[key] !== null) {
          const recipe = this.findRecipeInJsonLd(data[key]);
          if (recipe) return recipe;
        }
      }
    }
    return null;
  }

  private async mapSchemaOrgToRecipe(schema: any, sourceUrl: string, ogImageFallback?: string): Promise<any> {
    // Parse ingredients using the advanced parser
    const ingredientTexts = schema.recipeIngredient || [];
    console.log(`Parsing ${ingredientTexts.length} ingredients...`);
    
    const parsedIngredients = await Promise.all(
      ingredientTexts.map((ing: string) => this.ingredientsService.parseIngredient(ing))
    );
    
    // Log parsing results
    console.log('\n=== INGREDIENT PARSING RESULTS ===');
    parsedIngredients.forEach((parsed, index) => {
      const matched = parsed.ingredient ? '✅' : '❌';
      const unitMatched = parsed.unit ? '✅' : '⚪';
      console.log(`${matched} "${parsed.originalText}"`);
      console.log(`   → Ingredient: ${parsed.ingredient?.name || parsed.ingredientText} ${parsed.ingredient ? `(ID: ${parsed.ingredient.id.slice(0,8)}...)` : '(no match)'}`);
      console.log(`   → Quantity: ${parsed.quantity || 'none'}, Unit: ${parsed.unit?.name || parsed.unitText || 'none'} ${unitMatched}`);
      if (parsed.modifierTexts.length > 0) {
        console.log(`   → Modifiers: ${parsed.modifierTexts.join(', ')}`);
      }
    });
    console.log('=================================\n');
    
    // Convert parsed ingredients to recipe format
    const ingredients = parsedIngredients.map((parsed, index) => ({
      name: parsed.ingredient?.name || parsed.ingredientText,
      quantity: parsed.quantity ?? undefined, // Convert null to undefined
      unit: parsed.unit?.name || parsed.unitText || undefined,
      modifiers: parsed.modifierTexts.length > 0 ? parsed.modifierTexts : undefined,
      note: undefined, // Let modifiers handle this instead of note
      originalText: parsed.originalText,
      rawLine: parsed.originalText, // Store original line for reference when fixing
      knownIngredientId: parsed.ingredient?.id,
      knownUnitId: parsed.unit?.id,
      parsed: !!parsed.ingredient, // true if matched to known ingredient, false otherwise
    }));

    // Parse instructions - handle various formats
    let instructions = [];
    if (schema.recipeInstructions) {
      if (Array.isArray(schema.recipeInstructions)) {
        instructions = schema.recipeInstructions
          .map((inst: any, index: number) => {
            if (typeof inst === 'string') {
              return { position: index, text: inst.trim() };
            }
            // Handle HowToStep and HowToSection types
            if (inst['@type'] === 'HowToSection' && inst.itemListElement) {
              // Flatten sections into individual steps
              return inst.itemListElement.map((step: any, subIndex: number) => ({
                position: index * 100 + subIndex,
                text: typeof step === 'string' ? step : step.text || step.name || '',
                title: inst.name,
              }));
            }
            return {
              position: index,
              text: inst.text || inst.name || inst.description || '',
            };
          })
          .flat()
          .filter((inst: any) => inst.text)
          .map((inst: any, index: number) => ({
            ...inst,
            position: index,
          }));
      } else if (typeof schema.recipeInstructions === 'string') {
        instructions = schema.recipeInstructions
          .split(/\n+/)
          .filter((s: string) => s.trim())
          .map((text: string, index: number) => ({
            position: index,
            text: text.trim(),
          }));
      }
    }

    // Parse tags/keywords
    let tags: string[] = [];
    if (schema.keywords) {
      if (typeof schema.keywords === 'string') {
        tags = schema.keywords.split(',').map((k: string) => k.trim());
      } else if (Array.isArray(schema.keywords)) {
        tags = schema.keywords;
      }
    }

    // Also include recipeCategory and recipeCuisine as tags
    if (schema.recipeCategory) {
      const categories = Array.isArray(schema.recipeCategory)
        ? schema.recipeCategory
        : [schema.recipeCategory];
      tags = [...tags, ...categories];
    }
    if (schema.recipeCuisine) {
      const cuisines = Array.isArray(schema.recipeCuisine)
        ? schema.recipeCuisine
        : [schema.recipeCuisine];
      tags = [...tags, ...cuisines];
    }

    // Remove duplicates
    tags = [...new Set(tags)];

    return {
      name: schema.name || 'Imported Recipe',
      description: this.cleanDescription(schema.description),
      prepTime: this.formatDuration(schema.prepTime),
      cookTime: this.formatDuration(schema.cookTime),
      totalTime: this.formatDuration(schema.totalTime),
      servings: this.parseServings(schema.recipeYield),
      sourceUrl,
      imageUrl: this.extractImageUrl(schema.image) || this.extractImageUrl(schema.thumbnailUrl) || ogImageFallback,
      ingredients,
      instructions,
      tags,
      isShared: false,
      sharedWith: [],
    };
  }

  private extractImageUrl(image: any): string | undefined {
    if (!image) {
      console.log('No image property found in schema');
      return undefined;
    }

    console.log('Extracting image from:', JSON.stringify(image).substring(0, 500));

    // Handle string URL directly
    if (typeof image === 'string') {
      console.log('Image is a string URL:', image);
      return image;
    }

    // Handle array of images - take the first one
    if (Array.isArray(image)) {
      console.log('Image is an array with', image.length, 'items');
      // Try to find the best image (prefer larger ones or specific formats)
      for (const img of image) {
        const url = this.extractImageUrl(img);
        if (url) return url;
      }
      return undefined;
    }

    // Handle ImageObject with various url properties
    if (typeof image === 'object') {
      // Try various common properties
      const url = image.url || image.contentUrl || image['@id'] || image.src || image.href;
      if (url && typeof url === 'string' && url.startsWith('http')) {
        console.log('Found image URL in object:', url);
        return url;
      }
      // Some schemas nest the URL further
      if (image.image) {
        return this.extractImageUrl(image.image);
      }
    }

    console.log('Could not extract image URL from:', typeof image);
    return undefined;
  }

  private async downloadImage(imageUrl: string, sourceUrl?: string): Promise<string | null> {
    try {
      // Ensure uploads directory exists
      const uploadsDir = join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Extract origin from source URL for Referer header
      let referer = '';
      if (sourceUrl) {
        try {
          const url = new URL(sourceUrl);
          referer = url.origin;
        } catch (e) {
          referer = sourceUrl;
        }
      }

      // Fetch the image with headers that mimic a browser
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...(referer && { Referer: referer, Origin: referer }),
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch image: ${response.status} ${response.statusText} for URL: ${imageUrl}`);
        return null;
      }

      console.log(`Image fetch successful: ${response.status}, content-type: ${response.headers.get('content-type')}, size: ${response.headers.get('content-length')}`);


      // Determine file extension from content-type or URL
      const contentType = response.headers.get('content-type') || '';
      let extension = '.jpg'; // default

      if (contentType.includes('png')) {
        extension = '.png';
      } else if (contentType.includes('gif')) {
        extension = '.gif';
      } else if (contentType.includes('webp')) {
        extension = '.webp';
      } else if (contentType.includes('svg')) {
        extension = '.svg';
      } else {
        // Try to get extension from URL
        const urlExtMatch = imageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
        if (urlExtMatch) {
          extension = '.' + urlExtMatch[1].toLowerCase();
        }
      }

      // Generate unique filename
      const filename = `imported-${randomUUID()}${extension}`;
      const filepath = join(uploadsDir, filename);

      // Save the image
      const arrayBuffer = await response.arrayBuffer();
      await writeFile(filepath, Buffer.from(arrayBuffer));

      console.log(`Downloaded recipe image: ${filename}`);
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  private cleanDescription(desc: string | undefined): string {
    if (!desc) return '';
    // Remove HTML tags and decode entities
    return desc
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private formatDuration(duration: string | undefined): string | undefined {
    if (!duration) return undefined;

    // Handle ISO 8601 duration format (PT10M, PT1H30M, etc.)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
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

    // If it's already a human-readable string, return it
    if (!/^PT/.test(duration)) {
      return duration;
    }

    return undefined;
  }

  private parseServings(yield_: any): number | undefined {
    if (!yield_) return undefined;
    if (typeof yield_ === 'number') return yield_;
    if (typeof yield_ === 'string') {
      const match = yield_.match(/\d+/);
      return match ? parseInt(match[0]) : undefined;
    }
    if (Array.isArray(yield_) && yield_.length > 0) {
      return this.parseServings(yield_[0]);
    }
    return undefined;
  }
}
