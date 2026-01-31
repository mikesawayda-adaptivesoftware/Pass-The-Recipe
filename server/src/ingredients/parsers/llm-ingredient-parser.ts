import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { KnownIngredient, KnownUnit, KnownModifier } from '../../common/entities';
import { IIngredientParser, ParsedIngredient } from './ingredient-parser.interface';

interface LlmResponse {
  ingredient: string;
  quantity: number | string | null; // Can be number or string for ranges like "3-4"
  unit: string | null;
  modifiers: string[];
}

type LlmProvider = 'ollama' | 'openai';

@Injectable()
export class LlmIngredientParser implements IIngredientParser {
  private readonly logger = new Logger(LlmIngredientParser.name);
  private readonly provider: LlmProvider;
  private readonly ollamaUrl: string;
  private readonly model: string;
  private readonly timeout: number;
  private readonly openaiApiKey: string | null;

  constructor(
    @InjectRepository(KnownIngredient)
    private ingredientRepo: Repository<KnownIngredient>,
    @InjectRepository(KnownUnit)
    private unitRepo: Repository<KnownUnit>,
    @InjectRepository(KnownModifier)
    private modifierRepo: Repository<KnownModifier>,
  ) {
    this.openaiApiKey = process.env.OPENAI_API_KEY || null;
    this.provider = (process.env.LLM_PROVIDER as LlmProvider) || (this.openaiApiKey ? 'openai' : 'ollama');
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || (this.provider === 'openai' ? 'gpt-4o-mini' : 'llama3.2:3b');
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10);
    
    this.logger.log(`Using ${this.provider} provider with model ${this.model}`);
  }

  getParserType(): string {
    return 'llm';
  }

  async parse(text: string): Promise<ParsedIngredient> {
    const originalText = text.trim();
    
    // Clean the text for LLM parsing - remove special characters and formatting
    const cleanedText = this.cleanIngredientText(originalText);
    
    // Debug logging - show what's sent to LLM first
    console.log(`[LLM-PARSE] Sent to LLM: "${cleanedText}"`);
    console.log(`[LLM-PARSE] (Original:   "${originalText}")`);

    try {
      // Call LLM API (Ollama or OpenAI)
      const llmResult = this.provider === 'openai' 
        ? await this.callOpenAI(cleanedText)
        : await this.callOllama(cleanedText);
      
      // Debug: log raw LLM response
      console.log(`[LLM-PARSE] LLM result: ${JSON.stringify(llmResult)}`);

      if (llmResult) {
        // Match LLM results to known entities in database
        const ingredient = await this.matchIngredient(llmResult.ingredient);
        const unit = await this.matchUnit(llmResult.unit);
        const { modifiers, modifierTexts } = await this.matchModifiers(llmResult.modifiers);

        return {
          quantity: llmResult.quantity,
          unit,
          unitText: llmResult.unit,
          ingredient,
          ingredientText: llmResult.ingredient,
          modifiers,
          modifierTexts,
          originalText,
          confidence: this.calculateConfidence(llmResult.quantity, unit, ingredient),
        };
      }
    } catch (error) {
      this.logger.warn(`LLM parsing failed for "${originalText}": ${error.message}`);
    }

    // Return empty result if LLM fails
    return {
      quantity: null,
      unit: null,
      unitText: null,
      ingredient: null,
      ingredientText: originalText,
      modifiers: [],
      modifierTexts: [],
      originalText,
      confidence: 0,
    };
  }

  private async callOllama(ingredientText: string): Promise<LlmResponse | null> {
    const prompt = `Parse this recipe ingredient into JSON.

CRITICAL Rules for ingredient field:
- KEEP the FULL ingredient name including variety, type, color, and form
- "lemon juice" is the ingredient, NOT "lemon" with modifier "juiced"
- "flour tortillas" is the ingredient, NOT "flour"
- "Kalamata olives" is the ingredient, NOT "olives"
- "chicken broth" is the ingredient, NOT "chicken"
- "tomato paste" is the ingredient, NOT "tomato"
- "soy sauce" is the ingredient, NOT "soy"
- "olive oil" is the ingredient, NOT "oil"
- SUGARS: "granulated sugar" "brown sugar" "powdered sugar" "coconut sugar" - keep the type! "granulated" is NOT a modifier!
- PEPPERS: Keep the FULL name! "red pepper" "bell pepper" "hungarian pepper" "serrano pepper" "poblano pepper" "jalapeño" - NEVER just "pepper"
- ONIONS: "red onion" "green onion" "white onion" "yellow onion" - keep the color!
- TOMATOES: "cherry tomatoes" "Roma tomatoes" "San Marzano tomatoes" - keep the variety!

Rules:
- ingredient: The BASE ingredient (sesame seeds, black beans, seaweed) - NOT "toasted sesame seeds" or "canned black beans"
  - EXCEPTION: Keep compound names like "lemon juice", "chicken broth", "flour tortillas", "Kalamata olives"
- quantity: Number, string for ranges "1-2", or null
  - Fractions: 1/4=0.25, 1/2=0.5, 1/3=0.33, 3/4=0.75
  - Mixed: 1 1/2=1.5
  - "1 to 2" or "1-2" -> "1-2"
  - "Some", "a few", "handful" -> null (no quantity)
- unit: Measurement (cup, tbsp, tsp, pound, oz, clove, piece) or null
- modifiers: Preparation (chopped, diced), state (toasted, canned, frozen, dried), quality (seasoned)
  - "toasted" goes in modifiers, "sesame seeds" is the ingredient
  - "canned" goes in modifiers, "black beans" is the ingredient

Examples:
"1 Tbsp lemon juice" -> {"ingredient":"lemon juice","quantity":1,"unit":"tbsp","modifiers":[]}
"4 flour tortillas" -> {"ingredient":"flour tortillas","quantity":4,"unit":"piece","modifiers":[]}
"1-2 tbsp chopped pitted Kalamata olives" -> {"ingredient":"Kalamata olives","quantity":"1-2","unit":"tbsp","modifiers":["chopped","pitted"]}
"2 cups chicken broth" -> {"ingredient":"chicken broth","quantity":2,"unit":"cup","modifiers":[]}
"1 cup cherry tomatoes, halved" -> {"ingredient":"cherry tomatoes","quantity":1,"unit":"cup","modifiers":["halved"]}
"3 tbsp tomato paste" -> {"ingredient":"tomato paste","quantity":3,"unit":"tbsp","modifiers":[]}
"2 tbsp soy sauce" -> {"ingredient":"soy sauce","quantity":2,"unit":"tbsp","modifiers":[]}
"3-4 tbsp extra virgin olive oil" -> {"ingredient":"extra virgin olive oil","quantity":"3-4","unit":"tbsp","modifiers":[]}
"1/4 cup diced onion" -> {"ingredient":"onion","quantity":0.25,"unit":"cup","modifiers":["diced"]}
"2-3 garlic cloves, minced" -> {"ingredient":"garlic","quantity":"2-3","unit":"clove","modifiers":["minced"]}
"2 boneless skinless chicken breasts" -> {"ingredient":"chicken breast","quantity":2,"unit":"piece","modifiers":["boneless","skinless"]}
"salt to taste" -> {"ingredient":"salt","quantity":null,"unit":null,"modifiers":[]}
"salt and pepper" -> {"ingredient":"salt and pepper","quantity":null,"unit":null,"modifiers":[]}
"2 hungarian red pepper, deseeded" -> {"ingredient":"hungarian red pepper","quantity":2,"unit":"piece","modifiers":["deseeded"]}
"1 red bell pepper, diced" -> {"ingredient":"red bell pepper","quantity":1,"unit":"piece","modifiers":["diced"]}
"2 jalapeños, sliced" -> {"ingredient":"jalapeño","quantity":2,"unit":"piece","modifiers":["sliced"]}
"1 medium red onion, chopped" -> {"ingredient":"red onion","quantity":1,"unit":"piece","modifiers":["chopped"]}
"3 green onions, sliced" -> {"ingredient":"green onion","quantity":3,"unit":"piece","modifiers":["sliced"]}
"1 tbsp toasted sesame seeds" -> {"ingredient":"sesame seeds","quantity":1,"unit":"tbsp","modifiers":["toasted"]}
"800g canned black beans" -> {"ingredient":"black beans","quantity":800,"unit":"g","modifiers":["canned"]}
"15oz can black beans, drained" -> {"ingredient":"black beans","quantity":15,"unit":"oz","modifiers":["canned","drained"]}
"Some toasted seasoned seaweed" -> {"ingredient":"seaweed","quantity":null,"unit":null,"modifiers":["toasted","seasoned"]}
"a handful of fresh basil" -> {"ingredient":"basil","quantity":null,"unit":"handful","modifiers":["fresh"]}
"frozen peas" -> {"ingredient":"peas","quantity":null,"unit":null,"modifiers":["frozen"]}
"1 cup granulated sugar" -> {"ingredient":"granulated sugar","quantity":1,"unit":"cup","modifiers":[]}
"1/2 cup brown sugar, packed" -> {"ingredient":"brown sugar","quantity":0.5,"unit":"cup","modifiers":["packed"]}
"2 cups powdered sugar" -> {"ingredient":"powdered sugar","quantity":2,"unit":"cup","modifiers":[]}
"1 cup sugar" -> {"ingredient":"granulated sugar","quantity":1,"unit":"cup","modifiers":[]}

Parse: "${ingredientText}"`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          format: 'json',
          stream: false,
          options: {
            temperature: 0, // Deterministic output
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const parsed = JSON.parse(data.response) as LlmResponse;

      // Validate the response has required fields
      if (typeof parsed.ingredient !== 'string') {
        throw new Error('Invalid response: missing ingredient');
      }

      // Handle quantity - can be number, string (for ranges), or null
      let quantity: number | string | null = null;
      if (typeof parsed.quantity === 'number') {
        quantity = parsed.quantity;
      } else if (typeof parsed.quantity === 'string') {
        const trimmed = parsed.quantity.trim();
        if (trimmed.includes('-') || trimmed.includes(' to ')) {
          // Keep ranges as strings like "3-4" or "3 to 4"
          quantity = trimmed;
        } else {
          // Try to parse as number (handles "1", "1.5", "0.25", etc.)
          const num = parseFloat(trimmed);
          if (!isNaN(num)) {
            quantity = num;
          }
        }
      }

      // Filter out non-modifier phrases that LLM sometimes includes
      const excludedPhrases = [
        'to taste', 'or to taste', 'as needed', 'optional', 'or more',
        'if desired', 'for garnish', 'for serving', 'about', 'approximately',
      ];
      const modifiers = Array.isArray(parsed.modifiers)
        ? parsed.modifiers
            .filter(mod => typeof mod === 'string' && mod.trim() !== '') // Ensure it's a non-empty string
            .filter(mod => 
              !excludedPhrases.some(phrase => 
                mod.toLowerCase().trim() === phrase || 
                mod.toLowerCase().trim().startsWith('or ') ||
                mod.toLowerCase().trim().startsWith('about ')
              )
            )
        : [];

      return {
        ingredient: parsed.ingredient,
        quantity,
        unit: typeof parsed.unit === 'string' ? parsed.unit : null,
        modifiers,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out');
      }
      throw error;
    }
  }

  private async callOpenAI(ingredientText: string): Promise<LlmResponse | null> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }

    const systemPrompt = `Parse recipe ingredients into JSON.

Rules:
- ingredient: BASE ingredient name. Put state/prep in modifiers.
  - "sesame seeds" NOT "toasted sesame seeds" (toasted → modifier)
  - "black beans" NOT "canned black beans" (canned → modifier)
  - KEEP compound names: "lemon juice", "chicken broth", "flour tortillas", "Kalamata olives"
  - KEEP variety for peppers/onions: "red bell pepper", "red onion", "hungarian pepper"
  - SUGARS: Keep the type! "granulated sugar", "brown sugar", "powdered sugar" - "granulated" is NOT a modifier!
  - Plain "sugar" = "granulated sugar"
- quantity: Number, "1-2" for ranges, or null. "Some"/"handful" → null
- unit: cup, tbsp, tsp, pound, oz, g, piece, can, or null
- modifiers: prep (chopped, diced), state (toasted, canned, frozen, dried, seasoned, packed)

Examples:
"1 Tbsp lemon juice" -> {"ingredient":"lemon juice","quantity":1,"unit":"tbsp","modifiers":[]}
"4 flour tortillas" -> {"ingredient":"flour tortillas","quantity":4,"unit":"piece","modifiers":[]}
"1-2 tbsp chopped Kalamata olives" -> {"ingredient":"Kalamata olives","quantity":"1-2","unit":"tbsp","modifiers":["chopped"]}
"2 cups chicken broth" -> {"ingredient":"chicken broth","quantity":2,"unit":"cup","modifiers":[]}
"1 tbsp toasted sesame seeds" -> {"ingredient":"sesame seeds","quantity":1,"unit":"tbsp","modifiers":["toasted"]}
"15oz canned black beans" -> {"ingredient":"black beans","quantity":15,"unit":"oz","modifiers":["canned"]}
"Some toasted seasoned seaweed" -> {"ingredient":"seaweed","quantity":null,"unit":null,"modifiers":["toasted","seasoned"]}
"2 hungarian red pepper, deseeded" -> {"ingredient":"hungarian red pepper","quantity":2,"unit":"piece","modifiers":["deseeded"]}
"1 red onion, chopped" -> {"ingredient":"red onion","quantity":1,"unit":"piece","modifiers":["chopped"]}
"frozen peas" -> {"ingredient":"peas","quantity":null,"unit":null,"modifiers":["frozen"]}
"1 cup granulated sugar" -> {"ingredient":"granulated sugar","quantity":1,"unit":"cup","modifiers":[]}
"1/2 cup brown sugar, packed" -> {"ingredient":"brown sugar","quantity":0.5,"unit":"cup","modifiers":["packed"]}
"1 cup sugar" -> {"ingredient":"granulated sugar","quantity":1,"unit":"cup","modifiers":[]}

Respond with JSON: {"ingredient":"...","quantity":...,"unit":"...","modifiers":[...]}`;

    // Retry with exponential backoff for rate limits
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[LlmIngredientParser] Rate limited, retrying in ${delay/1000}s (attempt ${attempt + 1}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Parse: "${ingredientText}"` }
            ],
            temperature: 0,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const statusCode = response.status;
          
          // If rate limited (429), retry
          if (statusCode === 429 && attempt < maxRetries) {
            lastError = new Error(`Rate limited: ${error.error?.message || response.statusText}`);
            continue;
          }
          
          throw new Error(`OpenAI API error: ${statusCode} - ${error.error?.message || response.statusText}`);
        }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content) as LlmResponse;

      // Validate the response has required fields
      if (typeof parsed.ingredient !== 'string' || !parsed.ingredient) {
        throw new Error('Invalid response: missing ingredient');
      }

      // Handle quantity - can be number, string (for ranges), or null
      let quantity: number | string | null = null;
      if (typeof parsed.quantity === 'number') {
        quantity = parsed.quantity;
      } else if (typeof parsed.quantity === 'string') {
        const trimmed = parsed.quantity.trim();
        if (trimmed.includes('-') || trimmed.includes(' to ')) {
          // Keep ranges as strings like "3-4" or "3 to 4"
          quantity = trimmed;
        } else {
          // Try to parse as number (handles "1", "1.5", "0.25", etc.)
          const num = parseFloat(trimmed);
          if (!isNaN(num)) {
            quantity = num;
          }
        }
      }

      // Filter modifiers
      const excludedPhrases = [
        'to taste', 'or to taste', 'as needed', 'optional', 'or more',
        'if desired', 'for garnish', 'for serving', 'about', 'approximately',
      ];
      const modifiers = Array.isArray(parsed.modifiers)
        ? parsed.modifiers
            .filter(mod => typeof mod === 'string' && mod.trim() !== '')
            .filter(mod => 
              !excludedPhrases.some(phrase => 
                mod.toLowerCase().trim() === phrase || 
                mod.toLowerCase().trim().startsWith('or ') ||
                mod.toLowerCase().trim().startsWith('about ')
              )
            )
        : [];

        return {
          ingredient: parsed.ingredient,
          quantity,
          unit: typeof parsed.unit === 'string' ? parsed.unit : null,
          modifiers,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('OpenAI request timed out');
        }
        // If it's not a rate limit error, throw immediately
        if (!error.message?.includes('Rate limited')) {
          throw error;
        }
        lastError = error;
      }
    }
    
    // All retries exhausted
    throw lastError || new Error('OpenAI request failed after retries');
  }

  private async matchIngredient(name: string): Promise<KnownIngredient | null> {
    if (!name) return null;

    const normalizedName = name.toLowerCase().trim();

    // Try exact match
    let ingredient = await this.ingredientRepo.findOne({
      where: { name: ILike(normalizedName) },
    });
    if (ingredient) return ingredient;

    // Try alias match
    const allIngredients = await this.ingredientRepo.find();
    for (const ing of allIngredients) {
      if (ing.aliases?.some(alias => alias.toLowerCase() === normalizedName)) {
        return ing;
      }
    }

    // Try partial match
    for (const ing of allIngredients) {
      const ingName = ing.name.toLowerCase();
      if (ingName.includes(normalizedName) || normalizedName.includes(ingName)) {
        return ing;
      }
    }

    return null;
  }

  private async matchUnit(unitText: string | null): Promise<KnownUnit | null> {
    if (!unitText) return null;

    const normalizedUnit = unitText.toLowerCase().trim();
    const units = await this.unitRepo.find();

    for (const unit of units) {
      if (unit.name.toLowerCase() === normalizedUnit) return unit;
      if (unit.abbreviation?.toLowerCase() === normalizedUnit) return unit;
      if (unit.aliases?.some(alias => alias.toLowerCase() === normalizedUnit)) return unit;
    }

    return null;
  }

  private async matchModifiers(modifierTexts: string[]): Promise<{ modifiers: KnownModifier[]; modifierTexts: string[] }> {
    const allModifiers = await this.modifierRepo.find();
    const foundModifiers: KnownModifier[] = [];
    const foundTexts: string[] = [];

    for (const modText of modifierTexts) {
      const normalizedMod = modText.toLowerCase().trim();

      for (const mod of allModifiers) {
        if (mod.name.toLowerCase() === normalizedMod) {
          foundModifiers.push(mod);
          foundTexts.push(modText);
          break;
        }
        if (mod.aliases?.some(alias => alias.toLowerCase() === normalizedMod)) {
          foundModifiers.push(mod);
          foundTexts.push(modText);
          break;
        }
      }

      // If no match found, still add the text
      if (!foundTexts.includes(modText)) {
        foundTexts.push(modText);
      }
    }

    return { modifiers: foundModifiers, modifierTexts: foundTexts };
  }

  private calculateConfidence(quantity: number | string | null, unit: KnownUnit | null, ingredient: KnownIngredient | null): number {
    let confidence = 0.1; // Base confidence for LLM parse
    if (quantity !== null) confidence += 0.2;
    if (unit !== null) confidence += 0.3;
    if (ingredient !== null) confidence += 0.4;
    return confidence;
  }

  /**
   * Clean ingredient text before sending to LLM
   * Removes special characters, bullet points, and normalizes formatting
   */
  private cleanIngredientText(text: string): string {
    let cleaned = text;
    
    // First, convert Unicode fractions to ASCII fractions BEFORE removing bullets
    // This ensures fractions aren't accidentally removed
    const fractionMap: Record<string, string> = {
      '½': '1/2',
      '⅓': '1/3',
      '⅔': '2/3',
      '¼': '1/4',
      '¾': '3/4',
      '⅕': '1/5',
      '⅖': '2/5',
      '⅗': '3/5',
      '⅘': '4/5',
      '⅙': '1/6',
      '⅚': '5/6',
      '⅛': '1/8',
      '⅜': '3/8',
      '⅝': '5/8',
      '⅞': '7/8',
    };
    
    for (const [frac, replacement] of Object.entries(fractionMap)) {
      cleaned = cleaned.replace(new RegExp(frac, 'g'), replacement);
    }
    
    // Now remove bullet points and special markers at the start
    // Only remove specific bullet characters, not fractions or numbers
    cleaned = cleaned.replace(/^[\s]*[■□●○•◦▪▫★☆✓✔✗✘\-\*#]+[\s]*/u, '');
    
    // Remove leading numbers with dots/parens that might be list markers (like "1." or "1)")
    // But be careful not to remove quantities like "1 cup"
    cleaned = cleaned.replace(/^\d+[\.\)]\s+(?=[a-zA-Z])/u, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
}

