import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { RecipeService } from '../../../../core/services/recipe.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ShoppingListService } from '../../../../core/services/shopping-list.service';
import { Recipe, Ingredient, Instruction } from '../../../../core/models';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule
  ],
  template: `
    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Loading recipe...</p>
      </div>
    } @else if (!recipe()) {
      <div class="not-found">
        <mat-icon>error_outline</mat-icon>
        <h2>Recipe not found</h2>
        <p>This recipe may have been deleted or you don't have access to it.</p>
        <a mat-raised-button color="primary" routerLink="/recipes">
          Back to Recipes
        </a>
      </div>
    } @else {
      <div class="recipe-detail">
        <div class="recipe-header" [style.backgroundImage]="recipe()!.imageUrl ? 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url(' + recipe()!.imageUrl + ')' : ''">
          <div class="header-content">
            <button mat-icon-button (click)="goBack()" class="back-btn">
              <mat-icon>arrow_back</mat-icon>
            </button>

            <div class="header-text">
              <h1>{{ recipe()!.name }}</h1>
              @if (recipe()!.owner?.displayName && recipe()!.ownerId !== authService.appUser()?.id) {
                <p class="owner">by {{ recipe()!.owner?.displayName }}</p>
              }
            </div>

            <div class="header-actions">
              <button mat-mini-fab 
                      [class.favorite-btn]="true"
                      [class.is-favorite]="isFavorite()"
                      (click)="toggleFavorite(); $event.stopPropagation()" 
                      [disabled]="togglingFavorite()"
                      [matTooltip]="isFavorite() ? 'Remove from Favorites' : 'Add to Favorites'">
                <mat-icon>{{ isFavorite() ? 'favorite' : 'favorite_border' }}</mat-icon>
              </button>
              <button mat-mini-fab color="accent" [matMenuTriggerFor]="shoppingMenu" matTooltip="Add to Shopping List">
                <mat-icon>add_shopping_cart</mat-icon>
              </button>
              <mat-menu #shoppingMenu="matMenu">
                <button mat-menu-item (click)="createNewListWithRecipe()">
                  <mat-icon>add</mat-icon>
                  <span>Create new list</span>
                </button>
                @if (shoppingLists().length > 0) {
                  <mat-divider></mat-divider>
                  <p class="menu-label">Add to existing list:</p>
                  @for (list of shoppingLists(); track list.id) {
                    <button mat-menu-item (click)="addToExistingList(list.id)">
                      <mat-icon>shopping_cart</mat-icon>
                      <span>{{ list.name }}</span>
                    </button>
                  }
                }
              </mat-menu>
            @if (isOwner()) {
                <a mat-mini-fab color="primary" [routerLink]="['/recipes', recipe()!.id, 'edit']" matTooltip="Edit Recipe">
                  <mat-icon>edit</mat-icon>
                </a>
                <button mat-mini-fab color="warn" 
                        (click)="deleteRecipe(); $event.stopPropagation()" 
                        [disabled]="deleting()"
                        matTooltip="Delete Recipe">
                  <mat-icon>{{ deleting() ? 'hourglass_empty' : 'delete' }}</mat-icon>
                </button>
              }
              </div>
          </div>

          <div class="recipe-meta-bar">
            @if (recipe()!.prepTime) {
              <div class="meta-item">
                <mat-icon>timer</mat-icon>
                <span>Prep: {{ recipe()!.prepTime }}</span>
              </div>
            }
            @if (recipe()!.cookTime) {
              <div class="meta-item">
                <mat-icon>whatshot</mat-icon>
                <span>Cook: {{ recipe()!.cookTime }}</span>
              </div>
            }
            @if (recipe()!.totalTime) {
              <div class="meta-item">
                <mat-icon>schedule</mat-icon>
                <span>Total: {{ recipe()!.totalTime }}</span>
              </div>
            }
            @if (recipe()!.servings) {
              <div class="meta-item">
                <mat-icon>people</mat-icon>
                <span>{{ recipe()!.servings }} servings</span>
              </div>
            }
          </div>
        </div>

        <div class="recipe-body">
          @if (recipe()!.description) {
            <section class="description-section">
              <p>{{ recipe()!.description }}</p>
            </section>
          }

          @if (recipe()!.tags && recipe()!.tags.length > 0) {
            <div class="tags-section">
              @for (tag of recipe()!.tags; track tag) {
                <span class="tag">{{ tag }}</span>
              }
            </div>
          }

          @if (recipe()?.originalMealieUser) {
            <div class="original-creator-section mealie">
              <mat-icon>person_outline</mat-icon>
              <span>Originally created by <strong>{{ recipe()?.originalMealieUser?.fullName }}</strong></span>
            </div>
          } @else if (recipe()?.owner) {
            <div class="original-creator-section">
              <mat-icon>person</mat-icon>
              <span>Created by <strong>{{ recipe()?.owner?.displayName }}</strong></span>
            </div>
          }

          <div class="content-grid">
            <section class="ingredients-section">
              <h2>
                <mat-icon>shopping_basket</mat-icon>
                Ingredients
              </h2>
              <div class="ingredients-list">
                @for (group of ingredientsBySection(); track group.section) {
                  @if (group.section) {
                    <div class="ingredient-section-header">{{ group.section }}</div>
                  }
                  <ul>
                    @for (ingredient of group.ingredients; track $index) {
                      <li>
                        <mat-checkbox color="primary">
                          <span class="ingredient-text">
                            @if (ingredient.quantity) {
                              <strong>{{ formatQuantity(ingredient.quantity) }}</strong>
                            }
                            @if (ingredient.unit) {
                              {{ ingredient.unit }}
                            }
                            {{ ingredient.name }}
                            @if (ingredient.modifiers?.length || ingredient.note) {
                              <span class="ingredient-modifiers">({{ formatModifiersAndNote(ingredient) }})</span>
                            }
                          </span>
                        </mat-checkbox>
                      </li>
                    }
                  </ul>
                }
              </div>
            </section>

            <section class="instructions-section">
              <h2>
                <mat-icon>format_list_numbered</mat-icon>
                Instructions
              </h2>
              <div class="instructions-list">
                @for (group of instructionsBySection(); track group.section) {
                  @if (group.section) {
                    <div class="instruction-section-header">{{ group.section }}</div>
                  }
                  <ol [start]="1">
                    @for (instruction of group.instructions; track instruction.position; let stepIdx = $index) {
                      <li class="instruction-step">
                        <span class="step-number">{{ stepIdx + 1 }}</span>
                        <p>{{ instruction.text }}</p>
                      </li>
                    }
                  </ol>
                }
              </div>
            </section>
          </div>

          @if (recipe()!.sourceUrl) {
            <section class="source-section">
              <mat-divider></mat-divider>
              <p>
                <mat-icon>link</mat-icon>
                Source: <a [href]="recipe()!.sourceUrl" target="_blank" rel="noopener">{{ recipe()!.sourceUrl }}</a>
              </p>
            </section>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .loading, .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 64px);
      gap: 1rem;
      text-align: center;
      padding: 2rem;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ccc;
      }

      h2 {
        margin: 0;
        color: #333;
      }

      p {
        color: #666;
        margin: 0 0 1rem 0;
      }
    }

    .recipe-detail {
      max-width: 1200px;
      margin: 0 auto;
    }

    .recipe-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      background-size: cover;
      background-position: center;
      color: white;
      padding: 2rem;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .back-btn {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    .header-text {
      flex: 1;

      h1 {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 2.5rem;
        margin: 0;
        line-height: 1.2;
      }

      .owner {
        opacity: 0.8;
        margin: 0.5rem 0 0 0;
        font-size: 1rem;
      }
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .favorite-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      transition: all 0.2s ease;

      &.is-favorite {
        background: #e94560;
        color: white;
      }

      &:hover:not([disabled]) {
        background: #e94560;
        transform: scale(1.05);
      }

      mat-icon {
        transition: transform 0.2s ease;
      }

      &:hover:not([disabled]) mat-icon {
        transform: scale(1.1);
      }
    }

    .menu-label {
      padding: 8px 16px 4px 16px;
      margin: 0;
      font-size: 12px;
      color: #666;
      font-weight: 500;
      text-transform: uppercase;
    }

    .recipe-meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-top: 2rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        opacity: 0.8;
      }
    }

    .recipe-body {
      padding: 2rem;
      background: white;
    }

    .description-section {
      font-size: 1.1rem;
      color: #444;
      line-height: 1.7;
      margin-bottom: 1.5rem;

      p {
        margin: 0;
      }
    }

    .tags-section {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 2rem;

      .tag {
        background: #f0f0f0;
        color: #666;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.875rem;
      }
    }

    .original-creator-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      margin-bottom: 2rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 8px;
      border-left: 4px solid #1a1a2e;
      font-size: 0.95rem;
      color: #555;

      mat-icon {
        color: #1a1a2e;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      strong {
        color: #1a1a2e;
      }

      .creator-email {
        color: #888;
        font-size: 0.85rem;
      }

      &.mealie {
        border-left-color: #e94560;

        mat-icon {
          color: #e94560;
        }
      }
    }

    .content-grid {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 3rem;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.4rem;
      color: #1a1a2e;
      margin: 0 0 1.5rem 0;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #e94560;

      mat-icon {
        color: #e94560;
      }
    }

    .ingredients-list {
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      li {
        padding: 0.5rem 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }
      }

      .ingredient-section-header {
        font-weight: 600;
        font-size: 1.1rem;
        color: #1a1a2e;
        margin: 1.5rem 0 0.75rem 0;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e94560;

        &:first-child {
          margin-top: 0;
        }
      }

      .ingredient-text {
        strong {
          color: #e94560;
        }
      }

      .ingredient-modifiers {
        color: #666;
        font-style: italic;
      }

      .ingredient-note {
        color: #888;
        font-style: italic;
      }
    }

    .instructions-list {
      ol {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .instruction-section-header {
        font-weight: 600;
        font-size: 1.1rem;
        color: #1a1a2e;
        margin: 1.5rem 0 1rem 0;
        padding: 0.5rem 0;
        border-bottom: 2px solid #e94560;

        &:first-child {
          margin-top: 0;
        }
      }

      .instruction-step {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;

        .step-number {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
        }

        p {
          margin: 0;
          line-height: 1.7;
          color: #444;
          padding-top: 4px;
        }
      }
    }

    .source-section {
      margin-top: 2rem;

      mat-divider {
        margin-bottom: 1.5rem;
      }

      p {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #666;
        font-size: 0.875rem;
        margin: 0;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        a {
          color: #e94560;
          text-decoration: none;
          word-break: break-all;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    @media (max-width: 900px) {
      .content-grid {
        grid-template-columns: 1fr;
      }

      .recipe-header h1 {
        font-size: 2rem;
      }
    }

    @media (max-width: 600px) {
      .recipe-header {
        padding: 1rem;
        min-height: 250px;
      }

      .recipe-body {
        padding: 1.5rem;
      }

      .recipe-meta-bar {
        flex-direction: column;
        gap: 0.75rem;
      }
    }
  `]
})
export class RecipeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private recipeService = inject(RecipeService);
  private shoppingListService = inject(ShoppingListService);
  private snackBar = inject(MatSnackBar);
  authService = inject(AuthService);

  recipe = signal<Recipe | null>(null);
  loading = signal(true);
  deleting = signal(false);
  isFavorite = signal(false);
  togglingFavorite = signal(false);
  shoppingLists = signal<Array<{ id: string; name: string }>>([]);

  // Group ingredients by section for display
  ingredientsBySection = computed(() => {
    const ingredients = this.recipe()?.ingredients || [];
    const groups: Array<{ section: string | null; ingredients: Ingredient[] }> = [];
    let currentSection: string | null = null;
    let currentGroup: Ingredient[] = [];

    for (const ingredient of ingredients) {
      const section = ingredient.section || null;
      
      if (section !== currentSection) {
        // Save the previous group if it has items
        if (currentGroup.length > 0) {
          groups.push({ section: currentSection, ingredients: currentGroup });
        }
        // Start new group
        currentSection = section;
        currentGroup = [ingredient];
      } else {
        currentGroup.push(ingredient);
      }
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push({ section: currentSection, ingredients: currentGroup });
    }

    return groups;
  });

  // Group instructions by section for display (step numbers restart for each section)
  instructionsBySection = computed(() => {
    const instructions = this.recipe()?.instructions || [];
    const groups: Array<{ section: string | null; instructions: Instruction[] }> = [];
    let currentSection: string | null = null;
    let currentGroup: Instruction[] = [];

    for (const instruction of instructions) {
      const section = instruction.title || null;
      
      if (section !== currentSection && section !== null) {
        // Save the previous group if it has items
        if (currentGroup.length > 0) {
          groups.push({ section: currentSection, instructions: currentGroup });
        }
        // Start new group with this section
        currentSection = section;
        currentGroup = [instruction];
      } else {
        currentGroup.push(instruction);
      }
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push({ section: currentSection, instructions: currentGroup });
    }

    return groups;
  });

  get isOwner(): () => boolean {
    return () => this.recipe()?.ownerId === this.authService.appUser()?.id;
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/recipes']);
      return;
    }

    try {
      const recipe = await this.recipeService.getRecipe(id);
      this.recipe.set(recipe);
      
      // Load favorite status and shopping lists
      this.loadFavoriteStatus(id);
      this.loadShoppingLists();
    } catch (e) {
      console.error('Failed to load recipe:', e);
      this.snackBar.open('Failed to load recipe', 'Dismiss', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  async loadShoppingLists(): Promise<void> {
    try {
      const lists = await this.shoppingListService.getAll().toPromise();
      this.shoppingLists.set(lists?.map(l => ({ id: l.id, name: l.name })) || []);
    } catch (e) {
      console.error('Failed to load shopping lists:', e);
    }
  }

  async loadFavoriteStatus(recipeId: string): Promise<void> {
    try {
      const isFav = await this.recipeService.isFavorite(recipeId);
      this.isFavorite.set(isFav);
    } catch (e) {
      console.error('Failed to load favorite status:', e);
    }
  }

  async toggleFavorite(): Promise<void> {
    const recipe = this.recipe();
    if (!recipe?.id || this.togglingFavorite()) return;

    this.togglingFavorite.set(true);
    
    try {
      if (this.isFavorite()) {
        await this.recipeService.removeFavorite(recipe.id);
        this.isFavorite.set(false);
        this.snackBar.open('Removed from favorites', 'OK', { duration: 2000 });
      } else {
        await this.recipeService.addFavorite(recipe.id);
        this.isFavorite.set(true);
        this.snackBar.open('Added to favorites!', 'View', { duration: 3000 })
          .onAction().subscribe(() => {
            this.router.navigate(['/favorites']);
          });
      }
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
      this.snackBar.open('Failed to update favorite', 'Dismiss', { duration: 3000 });
    } finally {
      this.togglingFavorite.set(false);
    }
  }

  async createNewListWithRecipe(): Promise<void> {
    const recipe = this.recipe();
    if (!recipe) return;

    try {
      const list = await this.shoppingListService.create({
        name: `Shopping for ${recipe.name}`,
        recipeIds: [recipe.id!],
      }).toPromise();
      
      this.snackBar.open('Shopping list created!', 'View', { duration: 5000 })
        .onAction().subscribe(() => {
          this.router.navigate(['/shopping', list?.id]);
        });
      
      this.loadShoppingLists();
    } catch (e) {
      console.error('Failed to create shopping list:', e);
      this.snackBar.open('Failed to create shopping list', 'Dismiss', { duration: 3000 });
    }
  }

  async addToExistingList(listId: string): Promise<void> {
    const recipe = this.recipe();
    if (!recipe) return;

    try {
      await this.shoppingListService.addRecipes(listId, [recipe.id!]).toPromise();
      
      this.snackBar.open('Recipe added to shopping list!', 'View', { duration: 5000 })
        .onAction().subscribe(() => {
          this.router.navigate(['/shopping', listId]);
        });
    } catch (e) {
      console.error('Failed to add to shopping list:', e);
      this.snackBar.open('Failed to add to shopping list', 'Dismiss', { duration: 3000 });
    }
  }

  async deleteRecipe(): Promise<void> {
    const recipe = this.recipe();
    if (!recipe || this.deleting()) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${recipe.name}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    this.deleting.set(true);
    
    try {
      await this.recipeService.deleteRecipe(recipe.id!);
      this.snackBar.open('Recipe deleted', 'OK', { duration: 3000 });
      this.router.navigate(['/recipes']);
    } catch (e) {
      console.error('Failed to delete recipe:', e);
      this.snackBar.open('Failed to delete recipe', 'Dismiss', { duration: 3000 });
      this.deleting.set(false);
    }
  }

  formatQuantity(quantity: number | string): string {
    // If it's a string (like a range "3-4"), return as-is
    if (typeof quantity === 'string') {
      return quantity;
    }

    // Convert decimal to fraction for common values
    const fractions: { [key: number]: string } = {
      0.25: '¼',
      0.33: '⅓',
      0.5: '½',
      0.67: '⅔',
      0.75: '¾',
      0.125: '⅛',
      0.375: '⅜',
      0.625: '⅝',
      0.875: '⅞'
    };

    const whole = Math.floor(quantity);
    const decimal = quantity - whole;

    if (decimal === 0) {
      return whole.toString();
    }

    // Check for close fraction matches
    for (const [dec, frac] of Object.entries(fractions)) {
      if (Math.abs(decimal - parseFloat(dec)) < 0.02) {
        return whole > 0 ? `${whole} ${frac}` : frac;
      }
    }

    return quantity.toString();
  }

  formatModifiersAndNote(ingredient: Ingredient): string {
    const parts: string[] = [];
    
    if (ingredient.modifiers?.length) {
      parts.push(ingredient.modifiers.join(', '));
    }
    
    if (ingredient.note) {
      parts.push(ingredient.note);
    }
    
    return parts.join('; ');
  }

  goBack(): void {
    this.location.back();
  }
}

