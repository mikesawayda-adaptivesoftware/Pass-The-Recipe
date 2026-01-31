import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ShoppingListService, ShoppingList, ShoppingListItem } from '../../../../core/services/shopping-list.service';
import { AddRecipesDialogComponent } from '../add-recipes-dialog/add-recipes-dialog.component';

@Component({
  selector: 'app-shopping-list-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatDialogModule,
  ],
  template: `
    <div class="page-container">
      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Loading shopping list...</p>
        </div>
      } @else if (list()) {
        <header class="page-header">
          <button mat-icon-button (click)="goBack()" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="header-content">
            <h1>
              @if (list()!.isComplete) {
                <mat-icon class="complete-icon">check_circle</mat-icon>
              }
              {{ list()!.name }}
            </h1>
            <p class="subtitle">
              {{ list()!.items.length }} items · {{ checkedCount() }} checked
            </p>
          </div>
          <div class="header-actions">
            <button mat-icon-button (click)="toggleComplete()" [matTooltip]="list()!.isComplete ? 'Mark Incomplete' : 'Mark Complete'">
              <mat-icon>{{ list()!.isComplete ? 'replay' : 'check_circle' }}</mat-icon>
            </button>
            <button mat-icon-button (click)="clearChecked()" [disabled]="checkedCount() === 0" matTooltip="Clear Checked Items">
              <mat-icon>remove_done</mat-icon>
            </button>
            <button mat-icon-button (click)="deleteList()" matTooltip="Delete List" class="delete-btn">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </header>

        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progress()"></div>
          </div>
          <span class="progress-text">{{ progress().toFixed(0) }}% complete</span>
        </div>

        @if (list()!.recipes.length > 0) {
          <div class="recipes-section">
            <h3>Recipes</h3>
            <div class="recipe-tags">
              @for (recipe of list()!.recipes; track recipe.id) {
                <span class="recipe-tag">{{ recipe.name }}</span>
              }
            </div>
          </div>
        }

        <div class="items-section">
          <div class="section-header">
            <h3>Shopping Items</h3>
            <mat-slide-toggle
              [checked]="convertUnits()"
              (change)="convertUnits.set($event.checked)"
              class="convert-toggle"
            >
              Convert units
            </mat-slide-toggle>
            <button mat-stroked-button color="primary" (click)="openAddRecipesDialog()">
              <mat-icon>add</mat-icon>
              Add Recipes
            </button>
          </div>

          <div class="add-item-form">
            <mat-form-field appearance="outline" class="item-input">
              <mat-label>Add item manually</mat-label>
              <input matInput [(ngModel)]="newItemName" (keyup.enter)="addManualItem()" placeholder="e.g., Bananas">
            </mat-form-field>
            <button mat-icon-button color="primary" (click)="addManualItem()" [disabled]="!newItemName.trim()">
              <mat-icon>add_circle</mat-icon>
            </button>
          </div>

          @if (uncheckedItems().length > 0) {
            <div class="items-list">
              @for (group of groupedUncheckedItems(); track group.key) {
                <div class="group-header">
                  <span class="group-name">{{ group.displayName }}</span>
                    <div class="group-actions">
                      @if (convertUnits() && group.convertedTotal) {
                        <span class="group-total">{{ group.convertedTotal }}</span>
                      }
                      @if (group.items.length > 1) {
                        <button
                          mat-icon-button
                          class="group-complete"
                          matTooltip="Mark all '{{ group.displayName }}' as completed"
                          (click)="markGroupCompleted(group); $event.stopPropagation()"
                        >
                          <mat-icon>done_all</mat-icon>
                        </button>
                      }
                    </div>
                </div>

                @for (item of group.items; track item.id) {
                  <div class="item-row">
                    <mat-checkbox
                      [checked]="item.isChecked"
                      (change)="toggleItem(item)"
                      color="primary">
                    </mat-checkbox>
                    <div class="item-info">
                      <span class="item-name">
                        @if (item.quantity || item.unit) {
                          <span class="quantity-unit">
                            @if (item.quantity) {
                              <span class="quantity">{{ formatQuantity(item.quantity) }}</span>
                            }
                            @if (item.unit) {
                              <span class="unit">{{ item.unit }}</span>
                            }
                          </span>
                        }
                        <span class="name">{{ item.name }}</span>
                      </span>
                      @if (item.note) {
                        <span class="item-note">{{ item.note }}</span>
                      }
                    </div>
                    <button mat-icon-button (click)="removeItem(item)" class="remove-btn">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
              }
            </div>
          } @else {
            <div class="empty-items">
              <mat-icon>check_circle_outline</mat-icon>
              <p>All items checked! You're done shopping.</p>
            </div>
          }

          @if (checkedItems().length > 0) {
            <div class="checked-section">
              <button class="toggle-checked" (click)="showChecked = !showChecked">
                <mat-icon>{{ showChecked ? 'expand_less' : 'expand_more' }}</mat-icon>
                {{ checkedItems().length }} checked items
              </button>
              
              @if (showChecked) {
                <div class="items-list checked">
                  @for (group of groupedCheckedItems(); track group.key) {
                    <div class="group-header checked">
                      <span class="group-name">{{ group.displayName }}</span>
                      <div class="group-actions">
                        @if (convertUnits() && group.convertedTotal) {
                          <span class="group-total">{{ group.convertedTotal }}</span>
                        }
                      </div>
                    </div>

                    @for (item of group.items; track item.id) {
                      <div class="item-row checked">
                        <mat-checkbox
                          [checked]="item.isChecked"
                          (change)="toggleItem(item)"
                          color="primary">
                        </mat-checkbox>
                        <div class="item-info">
                          <span class="item-name">
                            @if (item.quantity || item.unit) {
                              <span class="quantity-unit">
                                @if (item.quantity) {
                                  <span class="quantity">{{ formatQuantity(item.quantity) }}</span>
                                }
                                @if (item.unit) {
                                  <span class="unit">{{ item.unit }}</span>
                                }
                              </span>
                            }
                            <span class="name">{{ item.name }}</span>
                          </span>
                        </div>
                        <button mat-icon-button (click)="removeItem(item)" class="remove-btn">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <h2>List not found</h2>
          <button mat-raised-button routerLink="/shopping">Back to Lists</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .back-btn {
      margin-top: 0.25rem;
    }

    .header-content {
      flex: 1;

      h1 {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 2rem;
        color: #1a1a2e;
        margin: 0 0 0.25rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .complete-icon {
        color: #4caf50;
      }

      .subtitle {
        color: #666;
        margin: 0;
      }
    }

    .header-actions {
      display: flex;
      gap: 0.25rem;

      button {
        color: #666;

        &:hover {
          color: #333;
        }

        &:disabled {
          color: #ccc;
        }
      }

      .delete-btn {
        color: #d32f2f;

        &:hover {
          color: #b71c1c;
          background: rgba(211, 47, 47, 0.08);
        }
      }
    }

    .loading, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1rem;
      color: #666;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ccc;
      }
    }

    .progress-section {
      margin-bottom: 1.5rem;
    }

    .progress-bar {
      height: 12px;
      background: #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(135deg, #4caf50 0%, #43a047 100%);
      border-radius: 6px;
      transition: width 0.3s ease;
    }

    .progress-text {
      color: #666;
      font-size: 0.9rem;
    }

    .recipes-section {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;

      h3 {
        margin: 0 0 0.75rem 0;
        color: #333;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .recipe-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .recipe-tag {
      background: white;
      color: #666;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 0.85rem;
      border: 1px solid #e0e0e0;
    }

    .items-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1rem 0.5rem 1rem;
      gap: 0.75rem;

      h3 {
        margin: 0;
        color: #333;
      }

      button {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .add-item-form {
      display: flex;
      align-items: center;
      padding: 0 1rem 1rem 1rem;
      gap: 0.5rem;

      .item-input {
        flex: 1;
      }
    }

    .convert-toggle {
      margin-left: auto;
      margin-right: 0.25rem;
    }

    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem 0.25rem 1rem;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
      min-height: 44px;

      &.checked {
        background: #f3f4f6;
      }
    }

    .group-name {
      font-weight: 700;
      color: #1a1a2e;
      line-height: 1.2;
    }

    .group-actions {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .group-total {
      font-size: 0.9rem;
      color: #334155;
      font-weight: 600;
      background: #eef2ff;
      border: 1px solid #e0e7ff;
      padding: 2px 8px;
      border-radius: 999px;
      line-height: 20px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
    }

    .group-complete {
      color: #2e7d32;

      &:hover {
        background: rgba(76, 175, 80, 0.12);
      }
    }

    .items-list {
      border-top: 1px solid #e0e0e0;
    }

    .item-row {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      gap: 0.75rem;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.2s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #f8f9fa;
      }

      &.checked {
        opacity: 0.6;

        .item-name {
          text-decoration: line-through;
        }
      }
    }

    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .item-name {
      color: #333;
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      flex-wrap: wrap;

      .quantity-unit {
        display: inline-flex;
        align-items: baseline;
        gap: 0.25rem;
        background: #f8f0f2;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.9rem;
      }

      .quantity {
        font-weight: 600;
        color: #e94560;
      }

      .unit {
        color: #666;
      }

      .name {
        color: #333;
      }
    }

    .item-note {
      font-size: 0.8rem;
      color: #888;
      font-style: italic;
    }

    .remove-btn {
      opacity: 0;
      transition: opacity 0.2s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .item-row:hover .remove-btn {
      opacity: 1;
    }

    .empty-items {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      color: #666;
      border-top: 1px solid #e0e0e0;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #4caf50;
        margin-bottom: 0.5rem;
      }
    }

    .checked-section {
      border-top: 1px solid #e0e0e0;
    }

    .toggle-checked {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem 1rem;
      background: #f8f9fa;
      border: none;
      cursor: pointer;
      color: #666;
      font-size: 0.9rem;

      &:hover {
        background: #f0f0f0;
      }
    }

    .items-list.checked {
      background: #fafafa;
    }

    @media (max-width: 600px) {
      .page-container {
        padding: 1rem;
      }

      .header-content h1 {
        font-size: 1.5rem;
      }

      .remove-btn {
        opacity: 1;
      }
    }
  `],
})
export class ShoppingListDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private shoppingListService = inject(ShoppingListService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  list = signal<ShoppingList | null>(null);
  loading = signal(true);
  newItemName = '';
  showChecked = false;
  convertUnits = signal(false);

  uncheckedItems = computed(() => 
    this.list()?.items.filter(i => !i.isChecked) || []
  );

  checkedItems = computed(() => 
    this.list()?.items.filter(i => i.isChecked) || []
  );

  groupedUncheckedItems = computed(() => this.groupItems(this.uncheckedItems()));
  groupedCheckedItems = computed(() => this.groupItems(this.checkedItems()));

  checkedCount = computed(() => this.checkedItems().length);

  progress = computed(() => {
    const l = this.list();
    if (!l || l.items.length === 0) return 0;
    return (this.checkedCount() / l.items.length) * 100;
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadList(id);
    }
  }

  async loadList(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const list = await this.shoppingListService.getOne(id).toPromise();
      this.list.set(list || null);
    } catch (e) {
      console.error('Failed to load list:', e);
      this.list.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  formatQuantity(quantity: number | string): string {
    // If it's a string (like a range "3-4"), return as-is
    if (typeof quantity === 'string') {
      return quantity;
    }
    // Format fractions nicely
    if (quantity === 0.25) return '¼';
    if (quantity === 0.5) return '½';
    if (quantity === 0.75) return '¾';
    if (quantity === 0.33 || quantity === 0.333) return '⅓';
    if (quantity === 0.67 || quantity === 0.666) return '⅔';
    if (Number.isInteger(quantity)) return quantity.toString();
    return quantity.toFixed(2).replace(/\.?0+$/, '');
  }

  private groupItems(items: ShoppingListItem[]): Array<{
    key: string;
    displayName: string;
    items: ShoppingListItem[];
    convertedTotal: string | null;
  }> {
    const map = new Map<string, { displayName: string; items: ShoppingListItem[] }>();

    for (const item of items) {
      const key = this.getGroupKey(item);
      const displayName = (item.knownIngredientId ? item.name : item.name).trim();
      const existing = map.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(key, { displayName, items: [item] });
      }
    }

    const groups = Array.from(map.entries()).map(([key, value]) => {
      const convertedTotal = this.computeConvertedTotal(value.items);
      // Keep stable ordering: first by name, then by position
      value.items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      return { key, displayName: value.displayName, items: value.items, convertedTotal };
    });

    groups.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return groups;
  }

  private getGroupKey(item: ShoppingListItem): string {
    if (item.knownIngredientId) return `known:${item.knownIngredientId}`;
    return `text:${(item.name || '').trim().toLowerCase()}`;
  }

  /**
   * Convert and sum compatible units within a group.
   * - Volume → ml (tsp/tbsp/cup/ml/l)
   * - Mass → g (g/kg/oz/lb)
   * If items are not fully convertible (missing qty/unit, ranges, "to taste", etc), returns null.
   */
  private computeConvertedTotal(items: ShoppingListItem[]): string | null {
    // Gather convertible numeric quantities by dimension
    let volumeMl = 0;
    let massG = 0;
    let hasVolume = false;
    let hasMass = false;

    for (const item of items) {
      if (item.quantity === null || item.quantity === undefined) continue;
      if (typeof item.quantity !== 'number') continue;
      const unitKey = this.normalizeUnitKey(item.unit);
      if (!unitKey) continue;

      const volFactor = this.volumeToMlFactor(unitKey);
      if (volFactor !== null) {
        hasVolume = true;
        volumeMl += item.quantity * volFactor;
        continue;
      }

      const massFactor = this.massToGFactor(unitKey);
      if (massFactor !== null) {
        hasMass = true;
        massG += item.quantity * massFactor;
        continue;
      }
    }

    // Only show a converted total if we actually converted something and it's not mixed dimensions.
    if (hasVolume && !hasMass && volumeMl > 0) {
      return this.formatMl(volumeMl);
    }
    if (hasMass && !hasVolume && massG > 0) {
      return this.formatG(massG);
    }
    return null;
  }

  async markGroupCompleted(group: { displayName: string; items: ShoppingListItem[] }): Promise<void> {
    const l = this.list();
    if (!l) return;

    const ids = group.items.map(i => i.id).filter(Boolean);
    if (ids.length === 0) return;

    try {
      await Promise.all(ids.map(id => this.shoppingListService.toggleItem(l.id, id).toPromise()));
      // Update local state once (mark checked)
      this.list.set({
        ...l,
        items: l.items.map(i => (ids.includes(i.id) ? { ...i, isChecked: true } : i)),
      });
      this.snackBar.open(`Marked ${ids.length} item(s) completed`, 'Dismiss', { duration: 2000 });
    } catch (e) {
      console.error('Failed to mark group completed:', e);
      this.snackBar.open('Failed to mark items completed', 'Dismiss', { duration: 3000 });
    }
  }

  private normalizeUnitKey(unit: string | null): string | null {
    if (!unit) return null;
    const u = unit.trim().toLowerCase();
    const map: Record<string, string> = {
      // volume
      'tsp': 'tsp',
      'teaspoon': 'tsp',
      'teaspoons': 'tsp',
      'tsps': 'tsp',
      'tbsp': 'tbsp',
      'tablespoon': 'tbsp',
      'tablespoons': 'tbsp',
      'tbsps': 'tbsp',
      'cup': 'cup',
      'cups': 'cup',
      'ml': 'ml',
      'milliliter': 'ml',
      'milliliters': 'ml',
      'l': 'l',
      'liter': 'l',
      'liters': 'l',
      // mass
      'g': 'g',
      'gram': 'g',
      'grams': 'g',
      'kg': 'kg',
      'kilogram': 'kg',
      'kilograms': 'kg',
      'oz': 'oz',
      'ounce': 'oz',
      'ounces': 'oz',
      'lb': 'lb',
      'lbs': 'lb',
      'pound': 'lb',
      'pounds': 'lb',
    };
    return map[u] ?? null;
  }

  private volumeToMlFactor(unitKey: string): number | null {
    switch (unitKey) {
      case 'tsp': return 4.92892;
      case 'tbsp': return 14.7868;
      case 'cup': return 236.588;
      case 'ml': return 1;
      case 'l': return 1000;
      default: return null;
    }
  }

  private massToGFactor(unitKey: string): number | null {
    switch (unitKey) {
      case 'g': return 1;
      case 'kg': return 1000;
      case 'oz': return 28.3495;
      case 'lb': return 453.592;
      default: return null;
    }
  }

  private formatMl(ml: number): string {
    // Prefer liters when large
    if (ml >= 1000) {
      const l = ml / 1000;
      return `${this.formatNumber(l)} l`;
    }
    // Prefer tbsp/tsp for very small amounts to be more human-friendly
    if (ml < 30) {
      const tsp = ml / 4.92892;
      // show tsp if < 3 tbsp
      return `${this.formatNumber(tsp)} tsp`;
    }
    if (ml < 240) {
      const tbsp = ml / 14.7868;
      return `${this.formatNumber(tbsp)} tbsp`;
    }
    const cups = ml / 236.588;
    return `${this.formatNumber(cups)} cups`;
  }

  private formatG(g: number): string {
    if (g >= 1000) {
      const kg = g / 1000;
      return `${this.formatNumber(kg)} kg`;
    }
    return `${this.formatNumber(g)} g`;
  }

  private formatNumber(n: number): string {
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(2).replace(/\.?0+$/, '');
  }

  async toggleItem(item: ShoppingListItem): Promise<void> {
    try {
      await this.shoppingListService.toggleItem(this.list()!.id, item.id).toPromise();
      // Update local state
      const updatedItems = this.list()!.items.map(i => 
        i.id === item.id ? { ...i, isChecked: !i.isChecked } : i
      );
      this.list.set({ ...this.list()!, items: updatedItems });
    } catch (e) {
      console.error('Failed to toggle item:', e);
      this.snackBar.open('Failed to update item', 'Dismiss', { duration: 3000 });
    }
  }

  async addManualItem(): Promise<void> {
    if (!this.newItemName.trim()) return;

    try {
      const newItem = await this.shoppingListService.addItem(
        this.list()!.id, 
        { name: this.newItemName.trim() }
      ).toPromise();
      
      if (newItem) {
        const updatedItems = [...this.list()!.items, newItem];
        this.list.set({ ...this.list()!, items: updatedItems });
        this.newItemName = '';
      }
    } catch (e) {
      console.error('Failed to add item:', e);
      this.snackBar.open('Failed to add item', 'Dismiss', { duration: 3000 });
    }
  }

  async removeItem(item: ShoppingListItem): Promise<void> {
    try {
      await this.shoppingListService.removeItem(this.list()!.id, item.id).toPromise();
      const updatedItems = this.list()!.items.filter(i => i.id !== item.id);
      this.list.set({ ...this.list()!, items: updatedItems });
    } catch (e) {
      console.error('Failed to remove item:', e);
      this.snackBar.open('Failed to remove item', 'Dismiss', { duration: 3000 });
    }
  }

  async toggleComplete(): Promise<void> {
    try {
      const updated = await this.shoppingListService.toggleComplete(this.list()!.id).toPromise();
      if (updated) {
        this.list.set(updated);
      }
    } catch (e) {
      console.error('Failed to toggle complete:', e);
      this.snackBar.open('Failed to update list', 'Dismiss', { duration: 3000 });
    }
  }

  async clearChecked(): Promise<void> {
    if (!confirm('Remove all checked items?')) return;

    try {
      const updated = await this.shoppingListService.clearChecked(this.list()!.id).toPromise();
      if (updated) {
        this.list.set(updated);
        this.snackBar.open('Checked items cleared', 'Dismiss', { duration: 3000 });
      }
    } catch (e) {
      console.error('Failed to clear checked:', e);
      this.snackBar.open('Failed to clear items', 'Dismiss', { duration: 3000 });
    }
  }

  async deleteList(): Promise<void> {
    if (!confirm(`Delete "${this.list()!.name}"? This cannot be undone.`)) return;

    try {
      await this.shoppingListService.delete(this.list()!.id).toPromise();
      this.snackBar.open('List deleted', 'Dismiss', { duration: 3000 });
      this.router.navigate(['/shopping']);
    } catch (e) {
      console.error('Failed to delete list:', e);
      this.snackBar.open('Failed to delete list', 'Dismiss', { duration: 3000 });
    }
  }

  openAddRecipesDialog(): void {
    const dialogRef = this.dialog.open(AddRecipesDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: { listId: this.list()!.id, existingRecipeIds: this.list()!.recipes.map(r => r.id) }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadList(this.list()!.id);
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}

