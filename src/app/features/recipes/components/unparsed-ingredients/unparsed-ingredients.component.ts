import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecipeService } from '../../../../core/services/recipe.service';
import { Recipe, Ingredient } from '../../../../core/models';
import { 
  FixIngredientDialogComponent, 
  FixIngredientDialogData, 
  FixIngredientDialogResult,
  SplitIngredient
} from '../fix-ingredient-dialog/fix-ingredient-dialog.component';

interface UnparsedSummary {
  ingredientName: string;
  count: number;
  recipes: { id: string; name: string }[];
}

interface IngredientWithMeta {
  ingredient: Ingredient;
  index: number;
  recipeId: string;
  recipeName: string;
}

@Component({
  selector: 'app-unparsed-ingredients',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="unparsed-page">
      <header class="page-header">
        <h1>Unparsed Ingredients</h1>
        <p class="subtitle">Recipes with ingredients that couldn't be matched to known ingredients</p>
      </header>

      @if (loading()) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading unparsed recipes...</p>
        </div>
      } @else if (error()) {
        <div class="error-message">
          <p>{{ error() }}</p>
          <button class="btn-primary" (click)="loadData()">Retry</button>
        </div>
      } @else {
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-value">{{ recipes().length }}</span>
            <span class="stat-label">Recipes with issues</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ totalUnparsedIngredients() }}</span>
            <span class="stat-label">Unparsed ingredients</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ uniqueUnparsedIngredients().length }}</span>
            <span class="stat-label">Unique ingredient names</span>
          </div>
          <button class="btn-secondary" (click)="downloadReport()">
            📥 Download Report
          </button>
        </div>

        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab() === 'recipes'"
            (click)="activeTab.set('recipes')">
            By Recipe
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab() === 'ingredients'"
            (click)="activeTab.set('ingredients')">
            By Ingredient
          </button>
        </div>

        @if (activeTab() === 'recipes') {
          <div class="recipes-list">
            @for (recipe of recipes(); track recipe.id) {
              <div class="recipe-card">
                <div class="recipe-header">
                  <h3>
                    <a [routerLink]="['/recipes', recipe.id]">{{ recipe.name }}</a>
                  </h3>
                  <span class="badge">{{ getUnparsedCount(recipe) }} unparsed</span>
                </div>
                <ul class="ingredients-list">
                  @for (ing of getUnparsedIngredientsWithIndex(recipe); track ing.index) {
                    <li class="ingredient-item unparsed">
                      <div class="ingredient-content">
                        <span class="original-text">{{ ing.ingredient.rawLine || ing.ingredient.originalText }}</span>
                        <div class="parsed-info">
                          <span class="parsed-name">→ "{{ ing.ingredient.name }}"</span>
                          @if (ing.ingredient.quantity) {
                            <span class="parsed-qty">qty: {{ ing.ingredient.quantity }}</span>
                          }
                          @if (ing.ingredient.unit) {
                            <span class="parsed-unit">unit: {{ ing.ingredient.unit }}</span>
                          }
                          @if (ing.ingredient.modifiers?.length) {
                            <span class="parsed-modifiers">mods: {{ ing.ingredient.modifiers?.join(', ') }}</span>
                          }
                        </div>
                      </div>
                      <button mat-icon-button 
                              class="fix-btn"
                              (click)="openFixDialog(recipe, ing.ingredient, ing.index)"
                              title="Fix this ingredient">
                        <mat-icon>build</mat-icon>
                      </button>
                    </li>
                  }
                </ul>
              </div>
            } @empty {
              <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h2>All ingredients parsed!</h2>
                <p>No recipes have unparsed ingredients. Great job!</p>
              </div>
            }
          </div>
        } @else {
          <div class="ingredients-summary">
            @for (summary of uniqueUnparsedIngredients(); track summary.ingredientName) {
              <div class="ingredient-summary-card">
                <div class="ingredient-header">
                  <span class="ingredient-name">{{ summary.ingredientName }}</span>
                  <div class="header-actions">
                    <span class="count-badge">{{ summary.count }}x</span>
                    <button mat-icon-button 
                            class="fix-btn-small"
                            (click)="fixAllByName(summary.ingredientName)"
                            title="Fix all occurrences">
                      <mat-icon>auto_fix_high</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="recipe-list">
                  @for (recipe of summary.recipes; track recipe.id) {
                    <a [routerLink]="['/recipes', recipe.id]" class="recipe-link">
                      {{ recipe.name }}
                    </a>
                  }
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h2>All ingredients parsed!</h2>
                <p>No unparsed ingredients found.</p>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .unparsed-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary, #1a1a2e);
      margin: 0 0 0.5rem 0;
    }

    .subtitle {
      color: var(--text-secondary, #666);
      margin: 0;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4rem 2rem;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border-color, #e0e0e0);
      border-top-color: var(--primary-color, #6366f1);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      text-align: center;
      padding: 2rem;
      background: #fee2e2;
      border-radius: 12px;
      color: #dc2626;
    }

    .stats-bar {
      display: flex;
      gap: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      margin-bottom: 1.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--primary-color, #6366f1);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary, #666);
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-primary {
      background: var(--primary-color, #6366f1);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-hover, #4f46e5);
    }

    .btn-secondary {
      background: white;
      border: 2px solid var(--border-color, #e0e0e0);
      color: var(--text-primary, #1a1a2e);
      margin-left: auto;
    }

    .btn-secondary:hover {
      border-color: var(--primary-color, #6366f1);
      color: var(--primary-color, #6366f1);
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid var(--border-color, #e0e0e0);
      padding-bottom: 0;
    }

    .tab {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-weight: 600;
      color: var(--text-secondary, #666);
      position: relative;
      transition: color 0.2s;
    }

    .tab:hover {
      color: var(--primary-color, #6366f1);
    }

    .tab.active {
      color: var(--primary-color, #6366f1);
    }

    .tab.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--primary-color, #6366f1);
    }

    .recipes-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .recipe-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid var(--border-color, #e0e0e0);
    }

    .recipe-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .recipe-header h3 {
      margin: 0;
      font-size: 1.125rem;
    }

    .recipe-header a {
      color: var(--primary-color, #6366f1);
      text-decoration: none;
    }

    .recipe-header a:hover {
      text-decoration: underline;
    }

    .badge {
      background: #fef3c7;
      color: #92400e;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .ingredients-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .ingredient-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .ingredient-item.unparsed {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .ingredient-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .original-text {
      color: var(--text-primary, #1a1a2e);
      font-family: monospace;
      font-size: 0.875rem;
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .parsed-info {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .parsed-name {
      color: #dc2626;
      font-style: italic;
    }

    .parsed-qty, .parsed-unit, .parsed-modifiers {
      font-size: 0.75rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .fix-btn {
      color: #6366f1;
      opacity: 0.7;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
        background: rgba(99, 102, 241, 0.1);
      }
    }

    .fix-btn-small {
      width: 32px;
      height: 32px;
      color: #6366f1;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .ingredients-summary {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .ingredient-summary-card {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid var(--border-color, #e0e0e0);
    }

    .ingredient-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .ingredient-name {
      font-weight: 600;
      color: #dc2626;
    }

    .count-badge {
      background: #fee2e2;
      color: #dc2626;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .recipe-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .recipe-link {
      font-size: 0.875rem;
      color: var(--primary-color, #6366f1);
      text-decoration: none;
    }

    .recipe-link:hover {
      text-decoration: underline;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #f0fdf4;
      border-radius: 12px;
      border: 1px solid #bbf7d0;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      color: #166534;
      margin: 0 0 0.5rem 0;
    }

    .empty-state p {
      color: #15803d;
      margin: 0;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .unparsed-page {
        padding: 1rem;
      }

      .page-header h1 {
        font-size: 1.5rem;
      }

      .stats-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem;
      }

      .btn-secondary {
        margin-left: 0;
        width: 100%;
      }

      .tabs {
        overflow-x: auto;
        white-space: nowrap;
        -webkit-overflow-scrolling: touch;
      }

      .tab {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
      }

      .recipes-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .recipe-card {
        padding: 1rem;
      }

      .recipe-title {
        font-size: 1rem;
      }

      .ingredients-summary {
        grid-template-columns: 1fr;
      }

      .ingredient-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .ingredient-actions {
        align-self: flex-end;
      }

      .original-text {
        font-size: 0.75rem;
        word-break: break-word;
      }

      .parsed-info {
        font-size: 0.7rem;
      }

      .stat-value {
        font-size: 1.25rem;
      }
    }
  `]
})
export class UnparsedIngredientsComponent implements OnInit {
  private recipeService = inject(RecipeService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  recipes = signal<Recipe[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<'recipes' | 'ingredients'>('recipes');

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const recipes = await this.recipeService.getUnparsedRecipes();
      this.recipes.set(recipes);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load unparsed recipes');
    } finally {
      this.loading.set(false);
    }
  }

  getUnparsedIngredients(recipe: Recipe): Ingredient[] {
    return recipe.ingredients.filter(i => i.parsed === false);
  }

  getUnparsedIngredientsWithIndex(recipe: Recipe): { ingredient: Ingredient; index: number }[] {
    return recipe.ingredients
      .map((ing, index) => ({ ingredient: ing, index }))
      .filter(item => item.ingredient.parsed === false);
  }

  getUnparsedCount(recipe: Recipe): number {
    return this.getUnparsedIngredients(recipe).length;
  }

  totalUnparsedIngredients(): number {
    return this.recipes().reduce((sum, r) => sum + this.getUnparsedCount(r), 0);
  }

  uniqueUnparsedIngredients(): UnparsedSummary[] {
    const map = new Map<string, UnparsedSummary>();

    for (const recipe of this.recipes()) {
      for (const ing of this.getUnparsedIngredients(recipe)) {
        const key = ing.name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            ingredientName: ing.name,
            count: 0,
            recipes: []
          });
        }
        const summary = map.get(key)!;
        summary.count++;
        if (!summary.recipes.find(r => r.id === recipe.id)) {
          summary.recipes.push({ id: recipe.id!, name: recipe.name });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  async openFixDialog(recipe: Recipe, ingredient: Ingredient, ingredientIndex: number) {
    const dialogRef = this.dialog.open(FixIngredientDialogComponent, {
      data: {
        ingredient,
        ingredientIndex,
        recipeId: recipe.id,
        recipeName: recipe.name,
      } as FixIngredientDialogData,
      width: '600px',
      maxHeight: '90vh',
      panelClass: 'centered-dialog',
      position: { top: '5vh' },
    });

    const result = await dialogRef.afterClosed().toPromise() as FixIngredientDialogResult | undefined;

    if (!result || result.action === 'cancel') {
      return;
    }

    try {
      if (result.action === 'split' && result.splitIngredients) {
        // Handle split action - replace one ingredient with multiple
        await this.recipeService.splitIngredient(
          recipe.id!,
          ingredientIndex,
          result.splitIngredients.map(si => ({
            name: si.name,
            quantity: si.quantity,
            unit: si.unit,
            modifiers: si.modifiers,
            originalText: si.originalText,
            parsed: false, // Will need to be matched
          }))
        );

        this.snackBar.open(
          `Split "${ingredient.originalText}" into ${result.splitIngredients.length} ingredients!`,
          'Close',
          { duration: 3000 }
        );
      } else if (result.ingredient) {
        // Handle update action
        await this.recipeService.updateIngredient(
          recipe.id!,
          ingredientIndex,
          result.ingredient
        );

        this.snackBar.open(
          `Updated "${ingredient.originalText}" successfully!`,
          'Close',
          { duration: 3000 }
        );
      }

      // Reload data to reflect changes
      await this.loadData();
    } catch (error: any) {
      this.snackBar.open(
        `Failed to update: ${error.message || 'Unknown error'}`,
        'Close',
        { duration: 5000 }
      );
    }
  }

  async fixAllByName(ingredientName: string) {
    // Find the first occurrence to open the dialog
    const allIngredients = this.getAllIngredientsWithMeta();
    const matching = allIngredients.filter(
      i => i.ingredient.name.toLowerCase() === ingredientName.toLowerCase()
    );

    if (matching.length === 0) return;

    // Open dialog for the first one
    const first = matching[0];
    const recipe = this.recipes().find(r => r.id === first.recipeId);
    if (!recipe) return;

    const dialogRef = this.dialog.open(FixIngredientDialogComponent, {
      data: {
        ingredient: first.ingredient,
        ingredientIndex: first.index,
        recipeId: first.recipeId,
        recipeName: first.recipeName,
      } as FixIngredientDialogData,
      width: '600px',
      maxHeight: '90vh',
      panelClass: 'centered-dialog',
      position: { top: '5vh' },
    });

    const result = await dialogRef.afterClosed().toPromise() as FixIngredientDialogResult | undefined;

    if (!result || result.action === 'cancel') {
      return;
    }

    // Note: Split action doesn't make sense for "fix all by name" - just use regular update
    if (result.action === 'split') {
      this.snackBar.open(
        'Split action is not supported for "Fix All". Please fix each ingredient individually.',
        'Close',
        { duration: 5000 }
      );
      return;
    }

    if (result.ingredient) {
      // Apply to all matching ingredients
      let successCount = 0;
      let failCount = 0;

      for (const item of matching) {
        try {
          await this.recipeService.updateIngredient(
            item.recipeId,
            item.index,
            result.ingredient
          );
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      this.snackBar.open(
        `Updated ${successCount} ingredients${failCount > 0 ? `, ${failCount} failed` : ''}`,
        'Close',
        { duration: 3000 }
      );

      // Reload data
      await this.loadData();
    }
  }

  private getAllIngredientsWithMeta(): IngredientWithMeta[] {
    const result: IngredientWithMeta[] = [];
    
    for (const recipe of this.recipes()) {
      recipe.ingredients.forEach((ing, index) => {
        if (ing.parsed === false) {
          result.push({
            ingredient: ing,
            index,
            recipeId: recipe.id!,
            recipeName: recipe.name,
          });
        }
      });
    }

    return result;
  }

  downloadReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        recipesWithIssues: this.recipes().length,
        totalUnparsedIngredients: this.totalUnparsedIngredients(),
        uniqueIngredientNames: this.uniqueUnparsedIngredients().length
      },
      uniqueIngredients: this.uniqueUnparsedIngredients().map(s => s.ingredientName),
      recipes: this.recipes().map(r => ({
        id: r.id,
        name: r.name,
        unparsedIngredients: this.getUnparsedIngredients(r).map(i => ({
          name: i.name,
          originalText: i.originalText
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unparsed-ingredients-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
