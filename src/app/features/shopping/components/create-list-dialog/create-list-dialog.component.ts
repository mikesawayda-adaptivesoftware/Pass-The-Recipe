import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ShoppingListService } from '../../../../core/services/shopping-list.service';
import { RecipeService } from '../../../../core/services/recipe.service';
import { Recipe } from '../../../../core/models';

@Component({
  selector: 'app-create-list-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Create Shopping List</h2>
    
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>List Name</mat-label>
        <input matInput [(ngModel)]="listName" placeholder="Weekly Groceries">
      </mat-form-field>

      <h3>Select Recipes</h3>
      <p class="helper-text">Choose recipes to add their ingredients to your shopping list.</p>

      @if (loadingRecipes()) {
        <div class="loading">
          <mat-spinner diameter="32"></mat-spinner>
        </div>
      } @else if (recipes().length === 0) {
        <p class="no-recipes">No recipes available. Create some recipes first!</p>
      } @else {
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search recipes</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" placeholder="Type to filter...">
          @if (searchQuery()) {
            <button matSuffix mat-icon-button (click)="searchQuery.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        @if (selectedRecipeIds().size > 0) {
          <div class="selected-count">
            {{ selectedRecipeIds().size }} recipe{{ selectedRecipeIds().size === 1 ? '' : 's' }} selected
          </div>
        }

        <div class="recipe-list">
          @for (recipe of filteredRecipes(); track recipe.id) {
            <div class="recipe-item" [class.selected]="isSelected(recipe)" (click)="toggleRecipe(recipe)">
              <mat-checkbox 
                [checked]="isSelected(recipe)" 
                (click)="$event.stopPropagation()"
                (change)="toggleRecipe(recipe)">
              </mat-checkbox>
              <div class="recipe-info">
                <span class="recipe-name">{{ recipe.name }}</span>
                <span class="ingredient-count">{{ recipe.ingredients.length || 0 }} ingredients</span>
              </div>
            </div>
          } @empty {
            <div class="no-results">
              <mat-icon>search_off</mat-icon>
              <p>No recipes match "{{ searchQuery() }}"</p>
            </div>
          }
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button 
        mat-raised-button 
        color="primary" 
        [disabled]="!listName.trim() || creating()"
        (click)="createList()">
        @if (creating()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          Create List
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
      max-height: 60vh;
    }

    .full-width {
      width: 100%;
    }

    h3 {
      margin: 1.5rem 0 0.5rem 0;
      color: #1a1a2e;
    }

    .helper-text {
      color: #666;
      font-size: 0.875rem;
      margin: 0 0 1rem 0;
    }

    .search-field {
      width: 100%;
      margin-bottom: 0.5rem;

      mat-icon {
        color: #888;
      }
    }

    .selected-count {
      font-size: 0.85rem;
      color: #e94560;
      font-weight: 500;
      margin-bottom: 0.5rem;
      padding: 0.25rem 0;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }

    .no-recipes {
      color: #666;
      text-align: center;
      padding: 1rem;
    }

    .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      color: #888;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        margin-bottom: 0.5rem;
      }

      p {
        margin: 0;
        font-size: 0.9rem;
      }
    }

    .recipe-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .recipe-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.2s ease;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #f8f9fa;
      }

      &.selected {
        background: rgba(233, 69, 96, 0.08);
      }
    }

    .recipe-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .recipe-name {
      font-weight: 500;
      color: #333;
    }

    .ingredient-count {
      font-size: 0.8rem;
      color: #888;
    }

    mat-dialog-actions button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Mobile responsiveness */
    @media (max-width: 480px) {
      mat-dialog-content {
        min-width: unset;
        padding: 0 0.5rem;
      }

      mat-dialog-actions {
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
      }

      .recipe-list {
        max-height: 35vh;
      }

      h3 {
        font-size: 1rem;
      }
    }
  `],
})
export class CreateListDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<CreateListDialogComponent>);
  private shoppingListService = inject(ShoppingListService);
  private recipeService = inject(RecipeService);
  private snackBar = inject(MatSnackBar);

  listName = '';
  searchQuery = signal('');
  recipes = signal<Recipe[]>([]);
  selectedRecipeIds = signal<Set<string>>(new Set());
  loadingRecipes = signal(true);
  creating = signal(false);

  filteredRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return this.recipes();
    }
    return this.recipes().filter(recipe => 
      recipe.name.toLowerCase().includes(query) ||
      recipe.description?.toLowerCase().includes(query) ||
      recipe.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  async ngOnInit(): Promise<void> {
    await this.loadRecipes();
  }

  async loadRecipes(): Promise<void> {
    this.loadingRecipes.set(true);
    try {
      const recipes = await this.recipeService.getMyRecipes();
      this.recipes.set(recipes);
    } catch (e) {
      console.error('Failed to load recipes:', e);
    } finally {
      this.loadingRecipes.set(false);
    }
  }

  isSelected(recipe: Recipe): boolean {
    return this.selectedRecipeIds().has(recipe.id!);
  }

  toggleRecipe(recipe: Recipe): void {
    const current = new Set(this.selectedRecipeIds());
    if (current.has(recipe.id!)) {
      current.delete(recipe.id!);
    } else {
      current.add(recipe.id!);
    }
    this.selectedRecipeIds.set(current);
  }

  async createList(): Promise<void> {
    if (!this.listName.trim()) return;

    this.creating.set(true);
    try {
      await this.shoppingListService.create({
        name: this.listName.trim(),
        recipeIds: Array.from(this.selectedRecipeIds()),
      }).toPromise();

      this.snackBar.open('Shopping list created!', 'Dismiss', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (e) {
      console.error('Failed to create list:', e);
      this.snackBar.open('Failed to create list', 'Dismiss', { duration: 3000 });
    } finally {
      this.creating.set(false);
    }
  }
}

