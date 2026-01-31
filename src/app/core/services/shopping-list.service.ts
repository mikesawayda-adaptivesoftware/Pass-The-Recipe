import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  isChecked: boolean;
  position: number;
  knownIngredientId: string | null;
}

export interface ShoppingList {
  id: string;
  ownerId: string;
  name: string;
  isComplete: boolean;
  items: ShoppingListItem[];
  recipes: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShoppingListDto {
  name: string;
  recipeIds?: string[];
}

export interface AddItemDto {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ShoppingListService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/shopping-lists`;

  /**
   * Create a new shopping list
   */
  create(dto: CreateShoppingListDto): Observable<ShoppingList> {
    return this.http.post<ShoppingList>(this.apiUrl, dto);
  }

  /**
   * Get all shopping lists
   */
  getAll(): Observable<ShoppingList[]> {
    return this.http.get<ShoppingList[]>(this.apiUrl);
  }

  /**
   * Get a single shopping list
   */
  getOne(id: string): Observable<ShoppingList> {
    return this.http.get<ShoppingList>(`${this.apiUrl}/${id}`);
  }

  /**
   * Add recipes to a shopping list
   */
  addRecipes(listId: string, recipeIds: string[]): Observable<ShoppingList> {
    return this.http.post<ShoppingList>(`${this.apiUrl}/${listId}/recipes`, {
      recipeIds,
    });
  }

  /**
   * Toggle item checked status
   */
  toggleItem(listId: string, itemId: string): Observable<ShoppingListItem> {
    return this.http.post<ShoppingListItem>(
      `${this.apiUrl}/${listId}/items/${itemId}/toggle`,
      {}
    );
  }

  /**
   * Add a manual item
   */
  addItem(listId: string, item: AddItemDto): Observable<ShoppingListItem> {
    return this.http.post<ShoppingListItem>(
      `${this.apiUrl}/${listId}/items`,
      item
    );
  }

  /**
   * Update an item
   */
  updateItem(
    listId: string,
    itemId: string,
    item: Partial<AddItemDto>
  ): Observable<ShoppingListItem> {
    return this.http.put<ShoppingListItem>(
      `${this.apiUrl}/${listId}/items/${itemId}`,
      item
    );
  }

  /**
   * Remove an item
   */
  removeItem(listId: string, itemId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/${listId}/items/${itemId}`
    );
  }

  /**
   * Toggle list complete status
   */
  toggleComplete(listId: string): Observable<ShoppingList> {
    return this.http.post<ShoppingList>(
      `${this.apiUrl}/${listId}/toggle-complete`,
      {}
    );
  }

  /**
   * Clear all checked items
   */
  clearChecked(listId: string): Observable<ShoppingList> {
    return this.http.post<ShoppingList>(
      `${this.apiUrl}/${listId}/clear-checked`,
      {}
    );
  }

  /**
   * Delete a shopping list
   */
  delete(listId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${listId}`);
  }
}

