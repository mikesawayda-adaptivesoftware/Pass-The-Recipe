import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { KnownIngredient, KnownUnit, KnownModifier } from '../../common/entities';
import { IIngredientParser, ParsedIngredient } from './ingredient-parser.interface';

@Injectable()
export class RulesIngredientParser implements IIngredientParser {
  constructor(
    @InjectRepository(KnownIngredient)
    private ingredientRepo: Repository<KnownIngredient>,
    @InjectRepository(KnownUnit)
    private unitRepo: Repository<KnownUnit>,
    @InjectRepository(KnownModifier)
    private modifierRepo: Repository<KnownModifier>,
  ) {}

  getParserType(): string {
    return 'rules';
  }

  async parse(text: string): Promise<ParsedIngredient> {
    const originalText = text.trim();
    
    // Clean the text - remove bullet points and special characters at the start
    const cleanedText = this.cleanInputText(originalText);
    let workingText = cleanedText.toLowerCase();

    // Extract quantity
    const { quantity, remainingText: afterQuantity } = this.extractQuantity(workingText);
    workingText = afterQuantity;

    // Extract unit
    const { unit, unitText, remainingText: afterUnit } = await this.extractUnit(workingText);
    workingText = afterUnit;

    // Extract modifiers
    const { modifiers, modifierTexts, remainingText: afterModifiers } = await this.extractModifiers(workingText);
    workingText = afterModifiers;

    // Clean up remaining text - this is the ingredient name
    const ingredientText = this.cleanIngredientText(workingText);

    // Try to match to known ingredient
    const ingredient = await this.matchIngredient(ingredientText);

    // Calculate confidence
    const confidence = this.calculateConfidence(quantity, unit, ingredient);

    return {
      quantity,
      unit,
      unitText,
      ingredient,
      ingredientText,
      modifiers,
      modifierTexts,
      originalText,
      confidence,
    };
  }

  private extractQuantity(text: string): { quantity: number | string | null; remainingText: string } {
    const fractionMap: Record<string, number> = {
      '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75,
      '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
      '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 0.167, '⅚': 0.833,
    };

    let workingText = text;
    for (const [frac, dec] of Object.entries(fractionMap)) {
      workingText = workingText.replace(new RegExp(frac, 'g'), ` ${dec} `);
    }

    // Pattern 1: Mixed number "1 1/2", "2 3/4"
    const mixedPattern = /^(\d+)\s+(\d+)\/(\d+)\s*/;
    const mixedMatch = workingText.match(mixedPattern);
    if (mixedMatch) {
      const whole = parseFloat(mixedMatch[1]);
      const num = parseFloat(mixedMatch[2]);
      const den = parseFloat(mixedMatch[3]);
      const quantity = whole + (num / den);
      return {
        quantity: isNaN(quantity) ? null : quantity,
        remainingText: workingText.substring(mixedMatch[0].length).trim(),
      };
    }

    // Pattern 2: Range "1-2", "3-4" - Keep as string!
    const rangePattern = /^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*/;
    const rangeMatch = workingText.match(rangePattern);
    if (rangeMatch) {
      // Keep the range as a string like "3-4"
      const rangeStr = `${rangeMatch[1]}-${rangeMatch[2]}`;
      return {
        quantity: rangeStr,
        remainingText: workingText.substring(rangeMatch[0].length).trim(),
      };
    }

    // Pattern 3: Simple fraction "1/4", "3/4"
    const fractionPattern = /^(\d+)\/(\d+)\s*/;
    const fractionMatch = workingText.match(fractionPattern);
    if (fractionMatch) {
      const num = parseFloat(fractionMatch[1]);
      const den = parseFloat(fractionMatch[2]);
      const quantity = num / den;
      return {
        quantity: isNaN(quantity) ? null : quantity,
        remainingText: workingText.substring(fractionMatch[0].length).trim(),
      };
    }

    // Pattern 4: Decimal or whole number (but make sure it's not followed by /)
    const numberPattern = /^(\d+(?:\.\d+)?)\s*(?!\/)/;
    const numberMatch = workingText.match(numberPattern);
    if (numberMatch) {
      const quantity = parseFloat(numberMatch[1]);
      return {
        quantity: isNaN(quantity) ? null : quantity,
        remainingText: workingText.substring(numberMatch[0].length).trim(),
      };
    }

    return { quantity: null, remainingText: text.trim() };
  }

  private async extractUnit(text: string): Promise<{ unit: KnownUnit | null; unitText: string | null; remainingText: string }> {
    const units = await this.unitRepo.find();
    const words = text.split(/\s+/);
    const cleanWords = words.map(w => w.replace(/[,;.!?()]/g, '').toLowerCase());

    const unitLookup = new Map<string, KnownUnit>();
    for (const unit of units) {
      unitLookup.set(unit.name.toLowerCase(), unit);
      if (unit.abbreviation) {
        unitLookup.set(unit.abbreviation.toLowerCase(), unit);
      }
      if (unit.aliases) {
        for (const alias of unit.aliases) {
          unitLookup.set(alias.toLowerCase(), unit);
        }
      }
    }

    for (let i = 0; i < words.length; i++) {
      for (let j = Math.min(i + 2, words.length); j > i; j--) {
        const phrase = cleanWords.slice(i, j).join(' ');
        const unit = unitLookup.get(phrase);
        if (unit) {
          const remainingWords = [...words.slice(0, i), ...words.slice(j)];
          return {
            unit,
            unitText: words.slice(i, j).join(' ').replace(/[,;.!?()]/g, ''),
            remainingText: remainingWords.join(' ').trim(),
          };
        }
      }
    }

    return { unit: null, unitText: null, remainingText: text };
  }

  private async extractModifiers(text: string): Promise<{ modifiers: KnownModifier[]; modifierTexts: string[]; remainingText: string }> {
    const allModifiers = await this.modifierRepo.find();
    const foundModifiers: KnownModifier[] = [];
    const foundTexts: string[] = [];
    let workingText = text;

    const modifierLookup = new Map<string, KnownModifier>();
    for (const mod of allModifiers) {
      modifierLookup.set(mod.name.toLowerCase(), mod);
      if (mod.aliases) {
        for (const alias of mod.aliases) {
          modifierLookup.set(alias.toLowerCase(), mod);
        }
      }
    }

    const sortedKeys = Array.from(modifierLookup.keys()).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      const pattern = new RegExp(`\\b${this.escapeRegex(key)}\\b`, 'gi');
      if (pattern.test(workingText)) {
        const mod = modifierLookup.get(key)!;
        if (!foundModifiers.find(m => m.id === mod.id)) {
          foundModifiers.push(mod);
          foundTexts.push(key);
        }
        workingText = workingText.replace(pattern, ' ').trim();
      }
    }

    return {
      modifiers: foundModifiers,
      modifierTexts: foundTexts,
      remainingText: workingText.replace(/\s+/g, ' ').trim(),
    };
  }

  private cleanIngredientText(text: string): string {
    return text
      .replace(/,.*$/, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async matchIngredient(text: string): Promise<KnownIngredient | null> {
    if (!text) return null;

    const normalizedText = text.toLowerCase().trim();

    let ingredient = await this.ingredientRepo.findOne({
      where: { name: ILike(normalizedText) },
    });
    if (ingredient) return ingredient;

    const allIngredients = await this.ingredientRepo.find();
    for (const ing of allIngredients) {
      if (ing.aliases?.some(alias => alias.toLowerCase() === normalizedText)) {
        return ing;
      }
    }

    for (const ing of allIngredients) {
      const ingName = ing.name.toLowerCase();
      if (ingName.includes(normalizedText) || normalizedText.includes(ingName)) {
        return ing;
      }
      if (ing.aliases?.some(alias => {
        const aliasLower = alias.toLowerCase();
        return aliasLower.includes(normalizedText) || normalizedText.includes(aliasLower);
      })) {
        return ing;
      }
    }

    return null;
  }

  private calculateConfidence(quantity: number | string | null, unit: KnownUnit | null, ingredient: KnownIngredient | null): number {
    let confidence = 0;
    if (quantity !== null) confidence += 0.2;
    if (unit !== null) confidence += 0.3;
    if (ingredient !== null) confidence += 0.5;
    return confidence;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Clean input text - remove bullet points and special characters at the start
   */
  private cleanInputText(text: string): string {
    let cleaned = text;
    
    // Remove specific bullet point characters at the start (not fractions or numbers)
    cleaned = cleaned.replace(/^[\s]*[■□●○•◦▪▫★☆✓✔✗✘\-\*#]+[\s]*/u, '');
    
    // Remove leading numbers with dots/parens that might be list markers (like "1." or "1)")
    // But be careful not to remove quantities like "1 cup"
    cleaned = cleaned.replace(/^\d+[\.\)]\s+(?=[a-zA-Z])/u, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
}

