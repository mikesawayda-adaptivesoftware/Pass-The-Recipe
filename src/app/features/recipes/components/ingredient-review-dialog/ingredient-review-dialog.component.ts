import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IngredientsService, ParsedIngredient, KnownIngredient } from '../../../../core/services/ingredients.service';
import { Ingredient } from '../../../../core/models';
import { 
  FixIngredientDialogComponent, 
  FixIngredientDialogData, 
  FixIngredientDialogResult 
} from '../fix-ingredient-dialog/fix-ingredient-dialog.component';

export interface IngredientReviewDialogData {
  recipeName: string;
  ingredientTexts: string[];
}

export interface ParsedIngredientWithStatus extends ParsedIngredient {
  index: number;
  matched: boolean;
  fixed?: boolean;
}

export interface IngredientReviewDialogResult {
  action: 'save' | 'cancel';
  ingredients?: Ingredient[];
}

@Component({
  selector: 'app-ingredient-review-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">checklist</mat-icon>
      Review Ingredients
    </h2>
    
    <mat-dialog-content>
      <div class="recipe-name">{{ data.recipeName }}</div>

      @if (parsing()) {
        <div class="parsing-status">
          <mat-progress-bar mode="determinate" [value]="parseProgress()"></mat-progress-bar>
          <p>Parsing ingredients... {{ parsedCount() }} of {{ data.ingredientTexts.length }}</p>
        </div>
      } @else {
        <div class="summary-bar">
          <div class="summary-item matched">
            <mat-icon>check_circle</mat-icon>
            <span>{{ matchedCount() }} matched</span>
          </div>
          <div class="summary-item unmatched" [class.has-issues]="unmatchedCount() > 0">
            <mat-icon>{{ unmatchedCount() > 0 ? 'warning' : 'check' }}</mat-icon>
            <span>{{ unmatchedCount() }} unmatched</span>
          </div>
        </div>

        @if (unmatchedCount() > 0) {
          <div class="help-text">
            <mat-icon>info</mat-icon>
            <span>Click the <strong>fix</strong> button to resolve unmatched ingredients, or save anyway and fix later.</span>
          </div>
        }

        <div class="ingredients-list">
          @for (ing of parsedIngredients(); track ing.index) {
            <div class="ingredient-row" [class.matched]="ing.matched" [class.unmatched]="!ing.matched" [class.fixed]="ing.fixed">
              <div class="status-icon">
                @if (ing.matched || ing.fixed) {
                  <mat-icon class="icon-matched">check_circle</mat-icon>
                } @else {
                  <mat-icon class="icon-unmatched">warning</mat-icon>
                }
              </div>
              <div class="ingredient-details">
                <div class="original-text">{{ ing.originalText }}</div>
                <div class="parsed-info">
                  @if (ing.quantity) {
                    <span class="quantity">{{ ing.quantity }}</span>
                  }
                  @if (ing.unit) {
                    <span class="unit">{{ ing.unit }}</span>
                  }
                  <span class="name" [class.not-matched]="!ing.matched && !ing.fixed">{{ ing.name }}</span>
                  @if (ing.modifiers && ing.modifiers.length > 0) {
                    <span class="modifiers">({{ ing.modifiers.join(', ') }})</span>
                  }
                </div>
              </div>
              @if (!ing.matched && !ing.fixed) {
                <button mat-stroked-button 
                        class="fix-btn"
                        (click)="fixIngredient(ing)">
                  <mat-icon>build</mat-icon>
                  Fix
                </button>
              }
              @if (ing.fixed) {
                <span class="fixed-badge">Fixed!</span>
              }
            </div>
          }
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      @if (!parsing()) {
        <button mat-raised-button 
                color="primary" 
                (click)="save()"
                [disabled]="parsing()">
          @if (unmatchedCount() > 0) {
            Save Anyway ({{ unmatchedCount() }} unmatched)
          } @else {
            Save Recipe
          }
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .title-icon {
      vertical-align: middle;
      margin-right: 8px;
      color: #6366f1;
    }

    .recipe-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .parsing-status {
      padding: 2rem;
      text-align: center;

      p {
        margin: 1rem 0 0 0;
        color: #64748b;
      }
    }

    .summary-bar {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border-radius: 8px;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;

      &.matched {
        color: #16a34a;
      }

      &.unmatched {
        color: #64748b;

        &.has-issues {
          color: #ea580c;
        }
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .help-text {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #fef3c7;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: #92400e;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 2px;
      }
    }

    .ingredients-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .ingredient-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.2s;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #f8fafc;
      }

      &.matched {
        background: #f0fdf4;
      }

      &.unmatched {
        background: #fef2f2;
      }

      &.fixed {
        background: #ecfdf5;
      }
    }

    .status-icon {
      flex-shrink: 0;
    }

    .icon-matched {
      color: #16a34a;
    }

    .icon-unmatched {
      color: #ea580c;
    }

    .ingredient-details {
      flex: 1;
      min-width: 0;
    }

    .original-text {
      font-size: 0.875rem;
      color: #64748b;
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .parsed-info {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      font-size: 0.9rem;
    }

    .quantity {
      font-weight: 600;
      color: #1e293b;
    }

    .unit {
      color: #64748b;
    }

    .name {
      font-weight: 500;
      color: #1e293b;

      &.not-matched {
        color: #dc2626;
      }
    }

    .modifiers {
      color: #64748b;
      font-style: italic;
    }

    .fix-btn {
      flex-shrink: 0;
      color: #6366f1;
      border-color: #6366f1;
    }

    .fixed-badge {
      flex-shrink: 0;
      padding: 0.25rem 0.75rem;
      background: #dcfce7;
      color: #16a34a;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    mat-dialog-content {
      min-width: min(500px, 90vw);
      max-width: 700px;
    }

    mat-dialog-actions {
      padding: 1rem 1.5rem;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* Mobile responsiveness */
    @media (max-width: 600px) {
      mat-dialog-content {
        min-width: unset;
        width: 100%;
        padding: 0.5rem;
      }

      mat-dialog-actions {
        padding: 0.75rem 1rem;
        
        button {
          flex: 1 1 auto;
        }
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
      }

      .parsed-info {
        font-size: 0.7rem;
      }
    }
  `]
})
export class IngredientReviewDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<IngredientReviewDialogComponent>);
  private dialog = inject(MatDialog);
  private ingredientsService = inject(IngredientsService);
  data = inject<IngredientReviewDialogData>(MAT_DIALOG_DATA);

  parsing = signal(true);
  parseProgress = signal(0);
  parsedCount = signal(0);
  parsedIngredients = signal<ParsedIngredientWithStatus[]>([]);

  ngOnInit() {
    this.parseAllIngredients();
  }

  async parseAllIngredients() {
    const results: ParsedIngredientWithStatus[] = [];
    const total = this.data.ingredientTexts.length;

    for (let i = 0; i < total; i++) {
      const text = this.data.ingredientTexts[i];
      
      try {
        const parsed = await this.ingredientsService.parseIngredient(text);
        results.push({
          ...parsed,
          index: i,
          matched: !!parsed.knownIngredientId,
        });
      } catch (error) {
        // If parsing fails, create a basic entry
        results.push({
          name: text,
          originalText: text,
          index: i,
          matched: false,
        });
      }

      this.parsedCount.set(i + 1);
      this.parseProgress.set(Math.round(((i + 1) / total) * 100));
      
      // Small delay to avoid overwhelming the API
      if (i < total - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.parsedIngredients.set(results);
    this.parsing.set(false);
  }

  matchedCount(): number {
    return this.parsedIngredients().filter(i => i.matched || i.fixed).length;
  }

  unmatchedCount(): number {
    return this.parsedIngredients().filter(i => !i.matched && !i.fixed).length;
  }

  async fixIngredient(ingredient: ParsedIngredientWithStatus) {
    const dialogRef = this.dialog.open(FixIngredientDialogComponent, {
      data: {
        ingredient: {
          name: ingredient.name,
          originalText: ingredient.originalText,
          rawLine: ingredient.originalText, // Use originalText as rawLine for new imports
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          modifiers: ingredient.modifiers,
        },
        ingredientIndex: ingredient.index,
        recipeId: 'new',
        recipeName: this.data.recipeName,
      } as FixIngredientDialogData,
      width: '600px',
      maxHeight: '90vh',
      panelClass: 'centered-dialog',
      position: { top: '5vh' },
    });

    const result = await dialogRef.afterClosed().toPromise() as FixIngredientDialogResult | undefined;

    if (result && result.action !== 'cancel' && result.ingredient) {
      // Update the ingredient in our list
      this.parsedIngredients.update(ingredients => 
        ingredients.map(ing => {
          if (ing.index === ingredient.index) {
            return {
              ...ing,
              name: result.ingredient!.name || ing.name,
              knownIngredientId: result.ingredient!.knownIngredientId,
              matched: true,
              fixed: true,
            };
          }
          return ing;
        })
      );
    }
  }

  save() {
    // Convert parsed ingredients to the Ingredient format
    const ingredients: Ingredient[] = this.parsedIngredients().map(parsed => ({
      name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      modifiers: parsed.modifiers,
      originalText: parsed.originalText,
      rawLine: parsed.originalText, // Store as rawLine for future reference
      knownIngredientId: parsed.knownIngredientId,
      knownUnitId: parsed.knownUnitId,
      parsed: parsed.matched || parsed.fixed || false,
    }));

    this.dialogRef.close({
      action: 'save',
      ingredients,
    } as IngredientReviewDialogResult);
  }

  cancel() {
    this.dialogRef.close({ action: 'cancel' } as IngredientReviewDialogResult);
  }
}

