import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface KnownIngredient {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  defaultUnit?: string;
}

export interface KnownUnit {
  id: string;
  name: string;
  abbreviation?: string;
  aliases: string[];
  type?: string;
}

// Raw response from backend LLM parser
export interface ParsedIngredientResponse {
  quantity?: number | string | null;
  unit?: KnownUnit | null;
  unitText?: string | null;
  ingredient?: KnownIngredient | null;
  ingredientText?: string;
  modifiers?: any[];
  modifierTexts?: string[];
  originalText: string;
  confidence?: number;
}

// Simplified interface for UI components
export interface ParsedIngredient {
  name: string;
  quantity?: number | string;
  unit?: string;
  modifiers?: string[];
  knownIngredientId?: string;
  knownUnitId?: string;
  originalText: string;
  confidence?: number;
}

@Injectable({
  providedIn: 'root'
})
export class IngredientsService {
  private http = inject(HttpClient);

  // Promise-based methods
  async getAllIngredients(): Promise<KnownIngredient[]> {
    const result = await this.http.get<KnownIngredient[]>(`${environment.apiUrl}/ingredients`).toPromise();
    return result || [];
  }

  async searchIngredientsAsync(query: string): Promise<KnownIngredient[]> {
    if (!query || query.length < 2) return [];
    const result = await this.http.get<KnownIngredient[]>(
      `${environment.apiUrl}/ingredients/search?q=${encodeURIComponent(query)}`
    ).toPromise();
    return result || [];
  }

  async parseIngredient(text: string): Promise<ParsedIngredient> {
    const response = await this.http.post<ParsedIngredientResponse>(
      `${environment.apiUrl}/ingredients/parse`,
      { text }
    ).toPromise();
    
    // Transform backend response to simplified format
    return this.transformParsedIngredient(response!);
  }

  private transformParsedIngredient(response: ParsedIngredientResponse): ParsedIngredient {
    return {
      name: response.ingredientText || response.ingredient?.name || response.originalText,
      quantity: response.quantity ?? undefined,
      unit: response.unitText || response.unit?.name || undefined,
      modifiers: response.modifierTexts || (response.modifiers?.map(m => typeof m === 'string' ? m : m?.name).filter(Boolean)) || [],
      knownIngredientId: response.ingredient?.id,
      knownUnitId: response.unit?.id,
      originalText: response.originalText,
      confidence: response.confidence,
    };
  }

  async createIngredient(data: { 
    name: string; 
    category?: string; 
    aliases?: string[]; 
    defaultUnit?: string 
  }): Promise<KnownIngredient> {
    const result = await this.http.post<KnownIngredient>(
      `${environment.apiUrl}/ingredients`,
      data
    ).toPromise();
    return result!;
  }

  async getAllUnits(): Promise<KnownUnit[]> {
    const result = await this.http.get<KnownUnit[]>(`${environment.apiUrl}/ingredients/units`).toPromise();
    return result || [];
  }

  // Observable-based methods (for components using RxJS patterns)
  searchIngredients(query: string): Observable<KnownIngredient[]> {
    if (!query || query.length < 2) return of([]);
    return this.http.get<KnownIngredient[]>(
      `${environment.apiUrl}/ingredients/search?q=${encodeURIComponent(query)}`
    ).pipe(
      catchError(() => of([]))
    );
  }

  getIngredients(): Observable<KnownIngredient[]> {
    return this.http.get<KnownIngredient[]>(`${environment.apiUrl}/ingredients`).pipe(
      catchError(() => of([]))
    );
  }

  getUnits(): Observable<KnownUnit[]> {
    return this.http.get<KnownUnit[]>(`${environment.apiUrl}/ingredients/units`).pipe(
      catchError(() => of([]))
    );
  }
}

// Alias for backward compatibility
export const IngredientsKnowledgeService = IngredientsService;
