import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { KnownIngredient } from '../models/known-ingredient.model';

@Injectable({
  providedIn: 'root'
})
export class IngredientService {
  private http = inject(HttpClient);

  async searchIngredients(query: string): Promise<KnownIngredient[]> {
    if (!query || query.length < 2) {
      return [];
    }
    
    const ingredients = await this.http.get<KnownIngredient[]>(
      `${environment.apiUrl}/ingredients/search`,
      { params: { q: query } }
    ).toPromise();
    
    return ingredients || [];
  }

  async getAllIngredients(): Promise<KnownIngredient[]> {
    const ingredients = await this.http.get<KnownIngredient[]>(
      `${environment.apiUrl}/ingredients`
    ).toPromise();
    
    return ingredients || [];
  }
}

