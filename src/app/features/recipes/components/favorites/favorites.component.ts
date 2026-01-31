import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ScrollPositionService } from '../../../../core/services/scroll-position.service';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecipeService } from '../../../../core/services/recipe.service';
import { IngredientService } from '../../../../core/services/ingredient.service';
import { Recipe, KnownIngredient } from '../../../../core/models';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

type SortOption = 'title-asc' | 'title-desc' | 'owner-asc' | 'owner-desc' | 'creator-asc' | 'creator-desc' | 'newest' | 'oldest';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <div class="title-row">
            <mat-icon class="page-icon">favorite</mat-icon>
            <h1>My Favorites</h1>
          </div>
          <p class="subtitle">{{ recipes().length }} favorite recipes</p>
        </div>
        <a mat-fab extended color="primary" routerLink="/recipes" class="browse-btn">
          <mat-icon>menu_book</mat-icon>
          Browse All Recipes
        </a>
      </header>

      <div class="filters-bar">
        <div class="search-sort-row">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search favorites</mat-label>
            <input matInput [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" placeholder="Search by name, ingredient, or tag...">
            <mat-icon matPrefix>search</mat-icon>
            @if (searchQuery) {
              <button matSuffix mat-icon-button (click)="searchQuery = ''; applyFilters()">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="sort-field">
            <mat-label>Sort by</mat-label>
            <mat-select [(ngModel)]="sortOption" (ngModelChange)="applyFilters()">
              <mat-option value="title-asc">Title (A-Z)</mat-option>
              <mat-option value="title-desc">Title (Z-A)</mat-option>
              <mat-option value="owner-asc">Creator (A-Z)</mat-option>
              <mat-option value="owner-desc">Creator (Z-A)</mat-option>
              <mat-option value="creator-asc">Mealie Creator (A-Z)</mat-option>
              <mat-option value="creator-desc">Mealie Creator (Z-A)</mat-option>
              <mat-option value="newest">Newest First</mat-option>
              <mat-option value="oldest">Oldest First</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="filter-row">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Filter by ingredients</mat-label>
            <input matInput
                   [(ngModel)]="ingredientQuery"
                   (ngModelChange)="onIngredientQueryChange($event)"
                   [matAutocomplete]="ingredientAuto"
                   placeholder="Type to search ingredients...">
            <mat-icon matPrefix>restaurant</mat-icon>
            <mat-autocomplete #ingredientAuto="matAutocomplete" (optionSelected)="selectIngredient($event.option.value)">
              @for (ingredient of ingredientSuggestions(); track ingredient.id) {
                <mat-option [value]="ingredient">{{ ingredient.name }}</mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Creator</mat-label>
              <input matInput
                     [(ngModel)]="ownerQuery"
                     (ngModelChange)="updateOwnerSuggestions($event)"
                     [matAutocomplete]="ownerAuto"
                     placeholder="Filter by creator...">
            <mat-icon matPrefix>person</mat-icon>
            @if (selectedOwner) {
              <button matSuffix mat-icon-button (click)="clearOwnerFilter()">
                <mat-icon>close</mat-icon>
              </button>
            }
            <mat-autocomplete #ownerAuto="matAutocomplete" (optionSelected)="selectOwner($event.option.value)">
              @for (owner of filteredOwners(); track owner) {
                <mat-option [value]="owner">{{ owner }}</mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Mealie Creator</mat-label>
              <input matInput
                     [(ngModel)]="creatorQuery"
                     (ngModelChange)="updateCreatorSuggestions($event)"
                     [matAutocomplete]="creatorAuto"
                     placeholder="Filter by Mealie creator...">
            <mat-icon matPrefix>person_outline</mat-icon>
            @if (selectedCreator) {
              <button matSuffix mat-icon-button (click)="clearCreatorFilter()">
                <mat-icon>close</mat-icon>
              </button>
            }
            <mat-autocomplete #creatorAuto="matAutocomplete" (optionSelected)="selectCreator($event.option.value)">
              @for (creator of filteredCreators(); track creator) {
                <mat-option [value]="creator">{{ creator }}</mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>
        </div>

        @if (selectedIngredients().length > 0) {
          <div class="selected-filters">
            @for (ingredient of selectedIngredients(); track ingredient.id) {
              <span class="filter-chip ingredient">
                <mat-icon>restaurant</mat-icon>
                {{ ingredient.name }}
                <button class="remove-btn" (click)="removeIngredient(ingredient)">
                  <mat-icon>close</mat-icon>
                </button>
              </span>
            }
          </div>
        }

        @if (hasActiveFilters()) {
          <div class="filter-actions">
            <button mat-button color="warn" (click)="clearAllFilters()" class="clear-all-btn">
              <mat-icon>clear_all</mat-icon>
              Clear All Filters
            </button>
          </div>
        }

        @if (filteredRecipes().length !== recipes().length) {
          <p class="filter-status">Showing {{ filteredRecipes().length }} of {{ recipes().length }} recipes</p>
        }
      </div>

      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Loading favorites...</p>
        </div>
      } @else if (filteredRecipes().length === 0) {
        <div class="empty-state">
          @if (hasActiveFilters()) {
            <mat-icon>search_off</mat-icon>
            <h2>No favorites found</h2>
            <p>Try adjusting your search terms or filters</p>
          } @else {
            <mat-icon>favorite_border</mat-icon>
            <h2>No favorites yet</h2>
            <p>Start adding recipes to your favorites by clicking the heart icon on any recipe!</p>
            <a mat-raised-button color="primary" routerLink="/recipes">
              <mat-icon>menu_book</mat-icon>
              Browse Recipes
            </a>
          }
        </div>
      } @else {
        <div class="recipe-grid">
          @for (recipe of filteredRecipes(); track recipe.id) {
            <mat-card class="recipe-card" (click)="navigateToRecipe(recipe.id!)">
              <div class="card-image" [style.backgroundImage]="recipe.imageUrl ? 'url(' + recipe.imageUrl + ')' : ''">
                @if (!recipe.imageUrl) {
                  <mat-icon class="placeholder-icon">restaurant</mat-icon>
                }
                <button mat-mini-fab 
                        class="unfavorite-btn"
                        (click)="removeFavorite(recipe); $event.stopPropagation()"
                        [disabled]="removingFavorite() === recipe.id">
                  <mat-icon>{{ removingFavorite() === recipe.id ? 'hourglass_empty' : 'favorite' }}</mat-icon>
                </button>
              </div>

              <mat-card-content>
                <h3 class="recipe-title">{{ recipe.name }}</h3>
                @if (recipe.description) {
                  <p class="recipe-description">{{ recipe.description }}</p>
                }

                <div class="recipe-meta">
                  @if (recipe.totalTime) {
                    <span class="meta-item">
                      <mat-icon>schedule</mat-icon>
                      {{ recipe.totalTime }}
                    </span>
                  }
                  @if (recipe.servings) {
                    <span class="meta-item">
                      <mat-icon>people</mat-icon>
                      {{ recipe.servings }} servings
                    </span>
                  }
                </div>

                @if (recipe.tags && recipe.tags.length > 0) {
                  <div class="recipe-tags">
                    @for (tag of recipe.tags.slice(0, 3); track tag) {
                      <span class="tag">{{ tag }}</span>
                    }
                    @if (recipe.tags.length > 3) {
                      <span class="tag more">+{{ recipe.tags.length - 3 }}</span>
                    }
                  </div>
                }

                @if (recipe.originalMealieUser) {
                  <div class="original-creator mealie">
                    <mat-icon>person_outline</mat-icon>
                    <span>Originally by {{ recipe.originalMealieUser.fullName }}</span>
                  </div>
                } @else if (recipe.owner) {
                  <div class="original-creator">
                    <mat-icon>person</mat-icon>
                    <span>Created by {{ recipe.owner.displayName }}</span>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .page-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: #e94560;
    }

    .header-content h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.5rem;
      color: #1a1a2e;
      margin: 0;
    }

    .subtitle {
      color: #666;
      margin: 0.5rem 0 0 0;
    }

    .browse-btn {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }

    .filters-bar {
      margin-bottom: 2rem;
    }

    .search-sort-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    .search-field {
      flex: 1;
      min-width: 280px;
      max-width: 500px;
    }

    .sort-field {
      min-width: 200px;
    }

    .filter-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
    }

    .filter-field {
      flex: 1;
      min-width: 200px;
      max-width: 280px;
    }

    .selected-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .filter-chip {
      display: inline-flex;
      align-items: center;
      color: white;
      padding: 6px 6px 6px 10px;
      border-radius: 20px;
      font-size: 0.875rem;
      gap: 4px;

      > mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.ingredient {
        background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
      }

      .remove-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        min-width: 22px;
        padding: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        cursor: pointer;
        transition: background 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.35);
        }

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
          color: white;
          line-height: 14px;
        }
      }
    }

    .filter-actions {
      margin-top: 0.5rem;
    }

    .clear-all-btn {
      font-size: 0.85rem;
    }

    .filter-status {
      color: #666;
      font-size: 0.875rem;
      margin: 0.5rem 0 0 0;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1rem;
      color: #666;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      text-align: center;
      color: #666;

      > mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #e94560;
        margin-bottom: 1rem;
      }

      h2 {
        margin: 0 0 0.5rem 0;
        color: #333;
      }

      p {
        margin: 0 0 1.5rem 0;
      }

      a[mat-raised-button] {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: inherit;
          margin-bottom: 0;
        }
      }
    }

    .recipe-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .recipe-card {
      cursor: pointer;
      transition: box-shadow 0.2s ease;
      border-radius: 12px;
      position: relative;

      &:hover {
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
      }

      .mat-mdc-card-content {
        border-radius: 0 0 12px 12px;
      }
    }

    .card-image {
      height: 180px;
      background-size: cover;
      background-position: center;
      background-color: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border-radius: 12px 12px 0 0;
      overflow: hidden;

      .placeholder-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #ccc;
      }
    }

    .unfavorite-btn {
      position: absolute;
      top: 12px;
      left: 12px;
      background: #e94560;
      color: white;
      transition: all 0.2s ease;

      &:hover:not([disabled]) {
        background: #c73e54;
        transform: scale(1.05);
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    mat-card-content {
      padding: 1rem;
    }

    .recipe-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #1a1a2e;
      line-height: 1.3;
    }

    .recipe-description {
      color: #666;
      font-size: 0.875rem;
      margin: 0 0 0.75rem 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .recipe-meta {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      color: #666;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .recipe-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tag {
      background: #f0f0f0;
      color: #666;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.75rem;

      &.more {
        background: #e94560;
        color: white;
      }
    }

    .original-creator {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 0.75rem;
      padding: 4px 8px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 6px;
      font-size: 0.75rem;
      color: #666;
      border-left: 3px solid #1a1a2e;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #1a1a2e;
      }

      &.mealie {
        border-left-color: #e94560;

        mat-icon {
          color: #e94560;
        }
      }
    }

    @media (max-width: 600px) {
      .page-header {
        flex-direction: column;
        gap: 1rem;
      }

      .search-sort-row {
        flex-direction: column;
      }

      .search-field, .sort-field {
        max-width: 100%;
        width: 100%;
      }

      .filter-row {
        flex-direction: column;
      }

      .filter-field {
        max-width: 100%;
      }

      .recipe-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FavoritesComponent implements OnInit, OnDestroy {
  private recipeService = inject(RecipeService);
  private ingredientService = inject(IngredientService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private scrollPositionService = inject(ScrollPositionService);

  private readonly SCROLL_KEY = 'favorites';
  private ingredientSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  recipes = signal<Recipe[]>([]);
  filteredRecipes = signal<Recipe[]>([]);
  loading = signal(true);
  removingFavorite = signal<string | null>(null);
  searchQuery = '';
  sortOption: SortOption = 'title-asc';

  // Ingredient filter
  ingredientQuery = '';
  ingredientSuggestions = signal<KnownIngredient[]>([]);
  selectedIngredients = signal<KnownIngredient[]>([]);

  // Owner filter (Imported by)
  ownerQuery = '';
  selectedOwner: string | null = null;
  allOwners = computed(() => {
    const owners = new Set<string>();
    this.recipes().forEach(r => {
      if (r.owner?.displayName) owners.add(r.owner.displayName);
    });
    return Array.from(owners).sort();
  });
  filteredOwners = signal<string[]>([]);

  // Creator filter (Original Creator)
  creatorQuery = '';
  selectedCreator: string | null = null;
  allCreators = computed(() => {
    const creators = new Set<string>();
    this.recipes().forEach(r => {
      if (r.originalMealieUser?.fullName) creators.add(r.originalMealieUser.fullName);
    });
    return Array.from(creators).sort();
  });
  filteredCreators = signal<string[]>([]);

  constructor() {
    // Set up debounced ingredient search
    this.ingredientSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(async (query) => {
      if (query.length >= 2) {
        const suggestions = await this.ingredientService.searchIngredients(query);
        const selectedIds = new Set(this.selectedIngredients().map(i => i.id));
        this.ingredientSuggestions.set(suggestions.filter(s => !selectedIds.has(s.id)));
      } else {
        this.ingredientSuggestions.set([]);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadFavorites();
    // Restore scroll position after data loads
    setTimeout(() => {
      this.scrollPositionService.restoreScrollPosition(this.SCROLL_KEY);
    }, 50);
  }

  ngOnDestroy(): void {
    this.scrollPositionService.saveScrollPosition(this.SCROLL_KEY);
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadFavorites(): Promise<void> {
    this.loading.set(true);
    try {
      const recipes = await this.recipeService.getFavorites();
      this.recipes.set(recipes);
      this.applyFilters();
    } catch (e) {
      console.error('Failed to load favorites:', e);
      this.snackBar.open('Failed to load favorites', 'Dismiss', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  // Ingredient filter methods
  onIngredientQueryChange(query: string): void {
    this.ingredientSearch$.next(query);
  }

  selectIngredient(ingredient: KnownIngredient): void {
    const current = this.selectedIngredients();
    if (!current.find(i => i.id === ingredient.id)) {
      this.selectedIngredients.set([...current, ingredient]);
      this.applyFilters();
    }
    this.ingredientQuery = '';
    this.ingredientSuggestions.set([]);
  }

  removeIngredient(ingredient: KnownIngredient): void {
    this.selectedIngredients.set(
      this.selectedIngredients().filter(i => i.id !== ingredient.id)
    );
    this.applyFilters();
  }

  // Owner filter methods
  updateOwnerSuggestions(query: string): void {
    if (!query) {
      this.filteredOwners.set(this.allOwners());
      return;
    }
    const lowerQuery = query.toLowerCase();
    this.filteredOwners.set(
      this.allOwners().filter(o => o.toLowerCase().includes(lowerQuery))
    );
  }

  selectOwner(owner: string): void {
    this.selectedOwner = owner;
    this.ownerQuery = owner;
    this.applyFilters();
  }

  clearOwnerFilter(): void {
    this.selectedOwner = null;
    this.ownerQuery = '';
    this.applyFilters();
  }

  // Creator filter methods
  updateCreatorSuggestions(query: string): void {
    if (!query) {
      this.filteredCreators.set(this.allCreators());
      return;
    }
    const lowerQuery = query.toLowerCase();
    this.filteredCreators.set(
      this.allCreators().filter(c => c.toLowerCase().includes(lowerQuery))
    );
  }

  selectCreator(creator: string): void {
    this.selectedCreator = creator;
    this.creatorQuery = creator;
    this.applyFilters();
  }

  clearCreatorFilter(): void {
    this.selectedCreator = null;
    this.creatorQuery = '';
    this.applyFilters();
  }

  // General filter methods
  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedIngredients().length > 0 || this.selectedOwner || this.selectedCreator);
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedIngredients.set([]);
    this.ingredientQuery = '';
    this.selectedOwner = null;
    this.ownerQuery = '';
    this.selectedCreator = null;
    this.creatorQuery = '';
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.recipes()];

    // Apply text search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(recipe =>
        recipe.name.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        recipe.ingredients?.some(ing => ing.name.toLowerCase().includes(query) || ing.originalText.toLowerCase().includes(query))
      );
    }

    // Apply ingredient filter (AND logic)
    if (this.selectedIngredients().length > 0) {
      filtered = filtered.filter(recipe => {
        return this.selectedIngredients().every(selectedIng => {
          const selectedName = selectedIng.name.toLowerCase();
          return recipe.ingredients?.some(recipeIng => {
            const recipeName = recipeIng.name.toLowerCase();
            return recipeName.includes(selectedName) || selectedName.includes(recipeName);
          });
        });
      });
    }

    // Apply owner filter
    if (this.selectedOwner) {
      filtered = filtered.filter(recipe => recipe.owner?.displayName === this.selectedOwner);
    }

    // Apply creator filter
    if (this.selectedCreator) {
      filtered = filtered.filter(recipe => recipe.originalMealieUser?.fullName === this.selectedCreator);
    }

    // Apply sorting
    filtered = this.sortRecipes(filtered);

    this.filteredRecipes.set(filtered);
  }

  private sortRecipes(recipes: Recipe[]): Recipe[] {
    return [...recipes].sort((a, b) => {
      switch (this.sortOption) {
        case 'title-asc':
          return a.name.localeCompare(b.name);
        case 'title-desc':
          return b.name.localeCompare(a.name);
        case 'owner-asc':
          return (a.owner?.displayName || '').localeCompare(b.owner?.displayName || '');
        case 'owner-desc':
          return (b.owner?.displayName || '').localeCompare(a.owner?.displayName || '');
        case 'creator-asc': {
          const aCreator = a.originalMealieUser?.fullName || a.owner?.displayName || '';
          const bCreator = b.originalMealieUser?.fullName || b.owner?.displayName || '';
          return aCreator.localeCompare(bCreator);
        }
        case 'creator-desc': {
          const aCreator = a.originalMealieUser?.fullName || a.owner?.displayName || '';
          const bCreator = b.originalMealieUser?.fullName || b.owner?.displayName || '';
          return bCreator.localeCompare(aCreator);
        }
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });
  }

  navigateToRecipe(recipeId: string): void {
    this.scrollPositionService.saveScrollPosition(this.SCROLL_KEY);
    this.router.navigate(['/recipes', recipeId]);
  }

  async removeFavorite(recipe: Recipe): Promise<void> {
    if (!recipe.id || this.removingFavorite()) return;

    this.removingFavorite.set(recipe.id);
    
    try {
      await this.recipeService.removeFavorite(recipe.id);
      
      // Remove from local lists
      const updatedRecipes = this.recipes().filter(r => r.id !== recipe.id);
      this.recipes.set(updatedRecipes);
      this.applyFilters();
      
      this.snackBar.open(`"${recipe.name}" removed from favorites`, 'Undo', { duration: 4000 })
        .onAction().subscribe(async () => {
          try {
            await this.recipeService.addFavorite(recipe.id!);
            await this.loadFavorites();
          } catch (e) {
            console.error('Failed to restore favorite:', e);
          }
        });
    } catch (e) {
      console.error('Failed to remove favorite:', e);
      this.snackBar.open('Failed to remove from favorites', 'Dismiss', { duration: 3000 });
    } finally {
      this.removingFavorite.set(null);
    }
  }
}

