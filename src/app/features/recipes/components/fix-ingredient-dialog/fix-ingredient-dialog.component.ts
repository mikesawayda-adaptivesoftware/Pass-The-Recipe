import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { IngredientsService, KnownIngredient, KnownUnit, ParsedIngredient } from '../../../../core/services/ingredients.service';
import { Ingredient } from '../../../../core/models';

export interface FixIngredientDialogData {
  ingredient: Ingredient;
  ingredientIndex: number;
  recipeId: string;
  recipeName: string;
}

export interface SplitIngredient {
  name: string;
  quantity?: number | string;
  unit?: string;
  modifiers?: string[];
  originalText: string;
}

export interface FixIngredientDialogResult {
  action: 'reparse' | 'select' | 'create' | 'manual' | 'split' | 'cancel';
  ingredient?: Partial<Ingredient>;
  newKnownIngredient?: KnownIngredient;
  splitIngredients?: SplitIngredient[]; // For split action
}

@Component({
  selector: 'app-fix-ingredient-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">build</mat-icon>
      Fix Ingredient
    </h2>
    
    <mat-dialog-content>
      <!-- Original Text Display -->
      <div class="original-text-section">
        <div class="original-label">
          <mat-icon>format_quote</mat-icon>
          Original Recipe Line
        </div>
        <div class="original-text-box">
          {{ data.ingredient.rawLine || data.ingredient.originalText }}
        </div>
        <div class="recipe-name">
          From: <strong>{{ data.recipeName }}</strong>
        </div>
      </div>

      <mat-divider></mat-divider>

      <mat-tab-group [(selectedIndex)]="selectedTab" class="fix-tabs">
        <!-- Tab 1: Manual Edit -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>edit</mat-icon>
            Manual Edit
          </ng-template>
          <div class="tab-content">
            <p class="tab-description">Manually correct the parsed ingredient details.</p>
            
            <div class="edit-form">
              <div class="form-row two-col">
                <div class="quantity-wrapper">
                  <mat-form-field appearance="outline" class="quantity-field">
                    <mat-label>Quantity</mat-label>
                    <input matInput 
                           [(ngModel)]="manualQuantity"
                           placeholder="e.g., 2, 1/2, 1-2">
                    @if (parsedQuantityPreview().valid) {
                      <mat-icon matSuffix class="quantity-valid">check_circle</mat-icon>
                    } @else if (manualQuantity && parsedQuantityPreview().type === 'error') {
                      <mat-icon matSuffix class="quantity-invalid">error</mat-icon>
                    }
                  </mat-form-field>
                  @if (manualQuantity) {
                    <div class="quantity-preview" [class.valid]="parsedQuantityPreview().valid" [class.invalid]="!parsedQuantityPreview().valid && parsedQuantityPreview().type === 'error'">
                      @if (parsedQuantityPreview().valid) {
                        <span class="preview-label">Stored as:</span>
                        <span class="preview-value">{{ parsedQuantityPreview().display }}</span>
                        <span class="preview-type">({{ parsedQuantityPreview().type }})</span>
                      } @else if (parsedQuantityPreview().type === 'error') {
                        <span class="preview-error">{{ parsedQuantityPreview().display }}</span>
                      }
                    </div>
                  } @else {
                    <div class="quantity-preview hint">
                      <span>Try: 2, 1/2, 1 1/2, ½, 1-2</span>
                    </div>
                  }
                </div>

                <mat-form-field appearance="outline" class="unit-field">
                  <mat-label>Unit</mat-label>
                  <input matInput 
                         [(ngModel)]="manualUnit"
                         [matAutocomplete]="unitAuto"
                         placeholder="e.g., cup, tbsp">
                  <mat-autocomplete #unitAuto="matAutocomplete">
                    @for (unit of filteredUnits(); track unit.id) {
                      <mat-option [value]="unit.name">
                        {{ unit.name }}
                        @if (unit.abbreviation) {
                          <span class="unit-abbrev">({{ unit.abbreviation }})</span>
                        }
                      </mat-option>
                    }
                  </mat-autocomplete>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Ingredient Name</mat-label>
                <input matInput 
                       [(ngModel)]="manualName"
                       (ngModelChange)="onNameChange($event)"
                       placeholder="e.g., chicken breast">
                <mat-autocomplete #ingredientAuto="matAutocomplete" (optionSelected)="onIngredientSelected($event)">
                  @for (ing of filteredIngredients(); track ing.id) {
                    <mat-option [value]="ing.name">
                      <span class="ing-name">{{ ing.name }}</span>
                      <span class="ing-category">{{ ing.category }}</span>
                    </mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Modifiers</mat-label>
                <input matInput 
                       [(ngModel)]="manualModifiers"
                       placeholder="e.g., chopped, diced, frozen (comma-separated)">
                <mat-hint>Preparation or state modifiers</mat-hint>
              </mat-form-field>

              @if (selectedKnownIngredient()) {
                <div class="matched-ingredient">
                  <mat-icon>check_circle</mat-icon>
                  Matched: <strong>{{ selectedKnownIngredient()?.name }}</strong>
                  <span class="category-badge">{{ selectedKnownIngredient()?.category }}</span>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- Tab 2: Re-parse with LLM -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>auto_fix_high</mat-icon>
            Re-parse with AI
          </ng-template>
          <div class="tab-content">
            <p class="tab-description">Send the ingredient text back to the AI for re-parsing.</p>
            
            @if (reparseLoading()) {
              <div class="loading-spinner">
                <mat-spinner diameter="40"></mat-spinner>
                <span>Parsing with AI...</span>
              </div>
            } @else if (reparsedResult()) {
              <div class="reparse-result">
                <h4>AI Result:</h4>
                <div class="result-details">
                  <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">{{ reparsedResult()?.name }}</span>
                  </div>
                  @if (reparsedResult()?.quantity) {
                    <div class="detail-row">
                      <span class="detail-label">Quantity:</span>
                      <span class="detail-value">{{ reparsedResult()?.quantity }}</span>
                    </div>
                  }
                  @if (reparsedResult()?.unit) {
                    <div class="detail-row">
                      <span class="detail-label">Unit:</span>
                      <span class="detail-value">{{ reparsedResult()?.unit }}</span>
                    </div>
                  }
                  @if (reparsedResult()?.modifiers?.length) {
                    <div class="detail-row">
                      <span class="detail-label">Modifiers:</span>
                      <span class="detail-value">{{ reparsedResult()?.modifiers?.join(', ') }}</span>
                    </div>
                  }
                  @if (reparsedResult()?.knownIngredientId) {
                    <div class="detail-row matched">
                      <mat-icon>check_circle</mat-icon>
                      <span>Matched to known ingredient!</span>
                    </div>
                  } @else {
                    <div class="detail-row not-matched">
                      <mat-icon>warning</mat-icon>
                      <span>Still no match found</span>
                    </div>
                  }
                </div>
                <button mat-stroked-button color="primary" (click)="useAiResult()" class="use-result-btn">
                  <mat-icon>check</mat-icon>
                  Use This Result
                </button>
              </div>
            } @else {
              <button mat-raised-button color="primary" (click)="reparseIngredient()">
                <mat-icon>psychology</mat-icon>
                Parse with AI
              </button>
            }
          </div>
        </mat-tab>

        <!-- Tab 3: Select from known ingredients -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>search</mat-icon>
            Select Known
          </ng-template>
          <div class="tab-content">
            <p class="tab-description">Search and select from existing known ingredients.</p>
            
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search ingredients</mat-label>
              <input matInput 
                     [(ngModel)]="searchQuery"
                     (ngModelChange)="onSearchChange($event)"
                     placeholder="Type to search...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            @if (searchLoading()) {
              <div class="loading-spinner small">
                <mat-spinner diameter="24"></mat-spinner>
              </div>
            }

            <div class="search-results">
              @for (ing of searchResults(); track ing.id) {
                <div class="search-result-item" 
                     [class.selected]="searchSelectedIngredient()?.id === ing.id"
                     (click)="selectSearchIngredient(ing)">
                  <div class="result-name">{{ ing.name }}</div>
                  <div class="result-meta">
                    <span class="category">{{ ing.category }}</span>
                    @if (ing.aliases.length) {
                      <span class="aliases">Also: {{ ing.aliases.slice(0, 3).join(', ') }}</span>
                    }
                  </div>
                </div>
              } @empty {
                @if (searchQuery.length >= 2 && !searchLoading()) {
                  <div class="no-results">No ingredients found for "{{ searchQuery }}"</div>
                }
              }
            </div>

            @if (searchSelectedIngredient()) {
              <div class="selected-ingredient">
                <mat-icon>check_circle</mat-icon>
                Selected: <strong>{{ searchSelectedIngredient()?.name }}</strong>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Tab 4: Split into multiple -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>call_split</mat-icon>
            Split
          </ng-template>
          <div class="tab-content">
            <p class="tab-description">
              Split this line into multiple separate ingredients.<br>
              <small>Useful for lines like "Salt and Pepper" or "1 tbsp cumin, cinnamon, chili powder"</small>
            </p>
            
            <div class="split-ingredients">
              @for (splitIng of splitIngredients(); track $index; let i = $index) {
                <div class="split-ingredient-row">
                  <div class="split-number">{{ i + 1 }}</div>
                  <div class="split-fields">
                    <div class="split-row-top">
                      <!-- Quantity with preview -->
                      <div class="split-qty-wrapper">
                        <mat-form-field appearance="outline" class="split-qty">
                          <mat-label>Qty</mat-label>
                          <input matInput 
                                 [(ngModel)]="splitIng.quantity"
                                 (ngModelChange)="onSplitQuantityChange(i)"
                                 placeholder="1, 1/2">
                          @if (getSplitQuantityPreview(i).valid) {
                            <mat-icon matSuffix class="quantity-valid">check_circle</mat-icon>
                          } @else if (splitIng.quantity && getSplitQuantityPreview(i).type === 'error') {
                            <mat-icon matSuffix class="quantity-invalid">error</mat-icon>
                          }
                        </mat-form-field>
                        @if (splitIng.quantity) {
                          <div class="split-qty-preview" [class.valid]="getSplitQuantityPreview(i).valid" [class.invalid]="getSplitQuantityPreview(i).type === 'error'">
                            {{ getSplitQuantityPreview(i).display }}
                          </div>
                        }
                      </div>
                      
                      <!-- Unit with autocomplete -->
                      <mat-form-field appearance="outline" class="split-unit">
                        <mat-label>Unit</mat-label>
                        <input matInput 
                               [(ngModel)]="splitIng.unit"
                               (ngModelChange)="onSplitUnitChange(i)"
                               [matAutocomplete]="splitUnitAuto"
                               placeholder="cup, tbsp">
                        <mat-autocomplete #splitUnitAuto="matAutocomplete">
                          @for (unit of getFilteredSplitUnits(i); track unit.id) {
                            <mat-option [value]="unit.name">
                              {{ unit.name }}
                              @if (unit.abbreviation) {
                                <span class="unit-abbrev">({{ unit.abbreviation }})</span>
                              }
                            </mat-option>
                          }
                        </mat-autocomplete>
                      </mat-form-field>
                      
                      <!-- Ingredient name with autocomplete and matching -->
                      <div class="split-name-wrapper">
                        <mat-form-field appearance="outline" class="split-name">
                          <mat-label>Ingredient Name</mat-label>
                          <input matInput 
                                 [(ngModel)]="splitIng.name"
                                 (ngModelChange)="onSplitNameChange(i)"
                                 [matAutocomplete]="splitIngAuto"
                                 placeholder="e.g., salt">
                          @if (getSplitIngredientMatch(i)) {
                            <mat-icon matSuffix class="ingredient-matched">check_circle</mat-icon>
                          }
                          <mat-autocomplete #splitIngAuto="matAutocomplete" (optionSelected)="onSplitIngredientSelected($event, i)">
                            @for (ing of getFilteredSplitIngredients(i); track ing.id) {
                              <mat-option [value]="ing.name">
                                <span class="ing-name">{{ ing.name }}</span>
                                <span class="ing-category">{{ ing.category }}</span>
                              </mat-option>
                            }
                          </mat-autocomplete>
                        </mat-form-field>
                        @if (getSplitIngredientMatch(i); as match) {
                          <div class="split-match-badge">
                            <mat-icon>check</mat-icon> {{ match.name }}
                          </div>
                        }
                      </div>
                    </div>
                    <mat-form-field appearance="outline" class="split-modifiers">
                      <mat-label>Modifiers (optional)</mat-label>
                      <input matInput 
                             [(ngModel)]="splitIng.modifiers"
                             placeholder="chopped, diced">
                    </mat-form-field>
                  </div>
                  <button mat-icon-button 
                          color="warn" 
                          (click)="removeSplitIngredient(i)"
                          [disabled]="splitIngredients().length <= 2"
                          matTooltip="Remove this ingredient">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>
            
            <button mat-stroked-button (click)="addSplitIngredient()" class="add-split-btn">
              <mat-icon>add</mat-icon>
              Add Another Ingredient
            </button>
          </div>
        </mat-tab>

        <!-- Tab 5: Add new ingredient to database -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>add_circle</mat-icon>
            Add New
          </ng-template>
          <div class="tab-content">
            <p class="tab-description">Create a new known ingredient to add to the database.</p>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Ingredient Name</mat-label>
              <input matInput [(ngModel)]="newIngredientName" placeholder="e.g., Kalamata Olives">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Category</mat-label>
              <mat-select [(ngModel)]="newIngredientCategory">
                <mat-option value="protein">Protein</mat-option>
                <mat-option value="produce">Produce</mat-option>
                <mat-option value="dairy">Dairy</mat-option>
                <mat-option value="grain">Grain</mat-option>
                <mat-option value="spice">Spice</mat-option>
                <mat-option value="condiment">Condiment</mat-option>
                <mat-option value="oil">Oil</mat-option>
                <mat-option value="baking">Baking</mat-option>
                <mat-option value="canned">Canned</mat-option>
                <mat-option value="frozen">Frozen</mat-option>
                <mat-option value="beverage">Beverage</mat-option>
                <mat-option value="other">Other</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Aliases (comma-separated)</mat-label>
              <input matInput [(ngModel)]="newIngredientAliases" 
                     placeholder="e.g., kalamata olive, greek olives">
            </mat-form-field>

            @if (createLoading()) {
              <div class="loading-spinner small">
                <mat-spinner diameter="24"></mat-spinner>
                <span>Creating...</span>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      
      @if (selectedTab === 0) {
        <button mat-raised-button color="primary" 
                (click)="applyManual()"
                [disabled]="!manualName">
          Apply Changes
        </button>
      }
      
      @if (selectedTab === 1 && reparsedResult()) {
        <button mat-raised-button color="primary" (click)="applyReparse()">
          Apply AI Result
        </button>
      }
      
      @if (selectedTab === 2 && searchSelectedIngredient()) {
        <button mat-raised-button color="primary" (click)="applySelected()">
          Use Selected
        </button>
      }

      @if (selectedTab === 3) {
        <button mat-raised-button color="primary" 
                (click)="applySplit()"
                [disabled]="!canApplySplit()">
          Split into {{ validSplitCount() }} Ingredients
        </button>
      }
      
      @if (selectedTab === 4 && newIngredientName) {
        <button mat-raised-button color="primary" 
                (click)="createAndApply()"
                [disabled]="createLoading()">
          Create & Apply
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

    .original-text-section {
      margin-bottom: 1rem;
    }

    .original-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 0.5rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .original-text-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
      border: 2px solid #fbbf24;
      border-radius: 8px;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 1rem;
      font-weight: 600;
      color: #92400e;
      word-break: break-word;
    }

    .recipe-name {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.5rem;
    }

    mat-divider {
      margin: 1rem 0;
    }

    .fix-tabs {
      margin-top: 0.5rem;
    }

    .tab-content {
      padding: 1.5rem 0.5rem;
    }

    .tab-description {
      color: #64748b;
      margin: 0 0 1rem 0;
      font-size: 0.875rem;

      small {
        color: #94a3b8;
      }
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;

      &.two-col {
        > * {
          flex: 1;
        }
      }
    }

    .quantity-wrapper {
      display: flex;
      flex-direction: column;
      max-width: 180px;
    }

    .quantity-field {
      width: 100%;
    }

    .quantity-valid {
      color: #22c55e;
    }

    .quantity-invalid {
      color: #ef4444;
    }

    .quantity-preview {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin-top: -0.5rem;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-wrap: wrap;

      &.valid {
        background: #ecfdf5;
        border: 1px solid #86efac;
        color: #166534;
      }

      &.invalid {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        color: #991b1b;
      }

      &.hint {
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        color: #64748b;
        font-style: italic;
      }

      .preview-label {
        font-weight: 500;
      }

      .preview-value {
        font-weight: 700;
        font-family: 'Courier New', monospace;
      }

      .preview-type {
        font-size: 0.65rem;
        color: #64748b;
        background: #e2e8f0;
        padding: 1px 4px;
        border-radius: 3px;
      }

      .preview-error {
        font-weight: 500;
      }
    }

    .unit-field {
      flex: 1;
    }

    .unit-abbrev {
      color: #64748b;
      margin-left: 0.5rem;
      font-size: 0.875rem;
    }

    .full-width {
      width: 100%;
    }

    .ing-name {
      font-weight: 500;
    }

    .ing-category {
      font-size: 0.75rem;
      color: #64748b;
      margin-left: 0.5rem;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: capitalize;
    }

    .matched-ingredient {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #dcfce7;
      border-radius: 8px;
      color: #166534;
      font-size: 0.875rem;

      mat-icon {
        color: #22c55e;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .category-badge {
      background: #bbf7d0;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: capitalize;
      margin-left: auto;
    }

    .loading-spinner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;

      &.small {
        padding: 0.5rem;
      }
    }

    .reparse-result {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 1rem;

      h4 {
        margin: 0 0 0.75rem 0;
        color: #166534;
      }
    }

    .result-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;

      &.matched {
        color: #166534;
        background: #dcfce7;
        padding: 0.5rem;
        border-radius: 4px;
        margin-top: 0.5rem;
      }

      &.not-matched {
        color: #92400e;
        background: #fef3c7;
        padding: 0.5rem;
        border-radius: 4px;
        margin-top: 0.5rem;
      }
    }

    .detail-label {
      font-weight: 600;
      color: #64748b;
      min-width: 80px;
    }

    .detail-value {
      color: #1e293b;
    }

    .use-result-btn {
      margin-top: 1rem;
    }

    .search-field {
      width: 100%;
    }

    .search-results {
      max-height: 250px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-top: 0.5rem;
    }

    .search-result-item {
      padding: 0.75rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.2s;

      &:hover {
        background: #f8fafc;
      }

      &.selected {
        background: #ede9fe;
        border-left: 3px solid #6366f1;
      }

      &:last-child {
        border-bottom: none;
      }
    }

    .result-name {
      font-weight: 500;
      color: #1e293b;
    }

    .result-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .category {
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: capitalize;
    }

    .aliases {
      color: #64748b;
      font-style: italic;
    }

    .no-results {
      padding: 2rem;
      text-align: center;
      color: #64748b;
    }

    .selected-ingredient {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem;
      background: #dcfce7;
      border-radius: 8px;
      color: #166534;

      mat-icon {
        color: #22c55e;
      }
    }

    /* Split tab styles */
    .split-ingredients {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .split-ingredient-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .split-number {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #6366f1;
      color: white;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
      margin-top: 0.75rem;
    }

    .split-fields {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .split-row-top {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .split-qty-wrapper {
      display: flex;
      flex-direction: column;
      width: 100px;
      flex-shrink: 0;
    }

    .split-qty {
      width: 100%;
    }

    .split-qty-preview {
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 3px;
      margin-top: -8px;
      margin-bottom: 4px;
      text-align: center;

      &.valid {
        background: #ecfdf5;
        border: 1px solid #86efac;
        color: #166534;
      }

      &.invalid {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        color: #991b1b;
      }
    }

    .split-unit {
      width: 110px;
      flex-shrink: 0;
    }

    .split-name-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 150px;
    }

    .split-name {
      width: 100%;
    }

    .split-match-badge {
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 3px;
      margin-top: -8px;
      margin-bottom: 4px;
      background: #ecfdf5;
      border: 1px solid #86efac;
      color: #166534;
      display: flex;
      align-items: center;
      gap: 2px;

      mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }

    .ingredient-matched {
      color: #22c55e;
    }

    .split-modifiers {
      width: 100%;
    }

    .add-split-btn {
      margin-top: 0.5rem;
    }

    mat-dialog-content {
      min-width: min(500px, 90vw);
      max-width: 650px;
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
          min-width: 100px;
        }
      }

      .form-row.two-col {
        flex-direction: column;
        gap: 0;
      }

      .quantity-wrapper {
        max-width: 100%;
        width: 100%;
      }

      .split-row-top {
        flex-direction: column;
      }

      .split-qty-wrapper,
      .split-unit,
      .split-name-wrapper {
        width: 100%;
        min-width: unset;
      }

      .original-text-box {
        font-size: 0.875rem;
        padding: 0.75rem;
      }

      .tab-content {
        padding: 1rem 0;
      }
    }
  `]
})
export class FixIngredientDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<FixIngredientDialogComponent>);
  private ingredientsService = inject(IngredientsService);
  data = inject<FixIngredientDialogData>(MAT_DIALOG_DATA);

  selectedTab = 0;

  // Manual edit state - use signals for reactive filtering
  manualQuantityInput = signal(''); // Signal for reactive quantity preview
  manualUnitQuery = signal(''); // Signal for reactive filtering
  manualNameQuery = signal(''); // Signal for reactive filtering
  manualModifiers = '';
  selectedKnownIngredient = signal<KnownIngredient | null>(null);
  allUnits = signal<KnownUnit[]>([]);
  allIngredients = signal<KnownIngredient[]>([]);
  
  // Getters/setters for template binding
  get manualQuantity(): string { return this.manualQuantityInput(); }
  set manualQuantity(value: string) { this.manualQuantityInput.set(value); }
  
  get manualUnit(): string { return this.manualUnitQuery(); }
  set manualUnit(value: string) { this.manualUnitQuery.set(value); }
  
  get manualName(): string { return this.manualNameQuery(); }
  set manualName(value: string) { this.manualNameQuery.set(value); }
  
  // Computed: Parse and preview the quantity
  parsedQuantityPreview = computed(() => {
    const input = this.manualQuantityInput().trim();
    if (!input) return { valid: false, display: '', value: null, type: '' };
    
    // Try to parse the quantity
    const result = this.parseQuantityInput(input);
    return result;
  });

  // Re-parse state
  reparseLoading = signal(false);
  reparsedResult = signal<ParsedIngredient | null>(null);

  // Search state
  searchQuery = '';
  searchLoading = signal(false);
  searchResults = signal<KnownIngredient[]>([]);
  searchSelectedIngredient = signal<KnownIngredient | null>(null);

  // Split state
  splitIngredients = signal<Array<{
    name: string;
    quantity: string;
    unit: string;
    modifiers: string;
  }>>([]);
  
  // Track matched ingredients for each split item
  splitIngredientMatches = signal<Map<number, KnownIngredient | null>>(new Map());

  // Create new state
  newIngredientName = '';
  newIngredientCategory = 'other';
  newIngredientAliases = '';
  createLoading = signal(false);

  private searchTimeout: any;
  private ingredientSearchTimeout: any;

  // Computed for filtered autocomplete results - now reactive!
  filteredUnits = computed(() => {
    const query = this.manualUnitQuery().toLowerCase();
    const units = this.allUnits();
    if (!query) return units.slice(0, 20); // Show more when no filter
    return units.filter(u => 
      u.name.toLowerCase().includes(query) || 
      u.abbreviation?.toLowerCase().includes(query) ||
      u.aliases?.some(a => a.toLowerCase().includes(query))
    ).slice(0, 20);
  });

  filteredIngredients = computed(() => {
    const query = this.manualNameQuery().toLowerCase();
    const ingredients = this.allIngredients();
    if (!query || query.length < 2) return [];
    return ingredients.filter(ing => 
      ing.name.toLowerCase().includes(query) ||
      ing.aliases?.some(a => a.toLowerCase().includes(query))
    ).slice(0, 15);
  });

  ngOnInit() {
    // Initialize manual edit fields from current ingredient
    const ing = this.data.ingredient;
    this.manualQuantity = ing.quantity?.toString() || '';
    this.manualUnit = ing.unit || '';
    this.manualName = ing.name || '';
    this.manualModifiers = ing.modifiers?.join(', ') || ing.note || '';
    
    // Pre-fill search and new ingredient name
    this.searchQuery = ing.name;
    this.newIngredientName = ing.name;
    
    // Initialize split with 2 empty entries
    this.splitIngredients.set([
      { name: '', quantity: '', unit: '', modifiers: '' },
      { name: '', quantity: '', unit: '', modifiers: '' }
    ]);
    
    // Load units and ingredients for autocomplete
    this.loadUnitsAndIngredients();
    
    // Trigger initial search
    this.onSearchChange(this.searchQuery);
  }

  private async loadUnitsAndIngredients() {
    try {
      const [units, ingredients] = await Promise.all([
        this.ingredientsService.getAllUnits(),
        this.ingredientsService.getAllIngredients()
      ]);
      this.allUnits.set(units);
      this.allIngredients.set(ingredients);
      
      // Try to match current ingredient name
      this.matchCurrentIngredient();
    } catch (error) {
      console.error('Failed to load units/ingredients:', error);
    }
  }

  private matchCurrentIngredient() {
    const name = this.manualName.toLowerCase();
    const match = this.allIngredients().find(ing => 
      ing.name.toLowerCase() === name ||
      ing.aliases?.some(a => a.toLowerCase() === name)
    );
    if (match) {
      this.selectedKnownIngredient.set(match);
    }
  }

  onNameChange(name: string) {
    this.manualName = name;
    
    // Debounce ingredient matching
    clearTimeout(this.ingredientSearchTimeout);
    this.ingredientSearchTimeout = setTimeout(() => {
      const match = this.allIngredients().find(ing => 
        ing.name.toLowerCase() === name.toLowerCase() ||
        ing.aliases?.some(a => a.toLowerCase() === name.toLowerCase())
      );
      this.selectedKnownIngredient.set(match || null);
    }, 200);
  }

  onIngredientSelected(event: any) {
    const selectedName = event.option.value;
    const match = this.allIngredients().find(ing => ing.name === selectedName);
    if (match) {
      this.selectedKnownIngredient.set(match);
      this.manualName = match.name;
    }
  }

  async reparseIngredient() {
    this.reparseLoading.set(true);
    try {
      const result = await this.ingredientsService.parseIngredient(
        this.data.ingredient.rawLine || this.data.ingredient.originalText
      );
      this.reparsedResult.set(result);
    } catch (error) {
      console.error('Failed to reparse:', error);
    } finally {
      this.reparseLoading.set(false);
    }
  }

  useAiResult() {
    const result = this.reparsedResult();
    if (!result) return;
    
    // Copy AI result to manual edit fields and switch to that tab
    this.manualQuantity = result.quantity?.toString() || '';
    this.manualUnit = result.unit || '';
    this.manualName = result.name;
    this.manualModifiers = result.modifiers?.join(', ') || '';
    
    // Find matching known ingredient
    if (result.knownIngredientId) {
      const match = this.allIngredients().find(ing => ing.id === result.knownIngredientId);
      this.selectedKnownIngredient.set(match || null);
    }
    
    this.selectedTab = 0; // Switch to manual edit tab
  }

  onSearchChange(query: string) {
    clearTimeout(this.searchTimeout);
    
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      this.searchLoading.set(true);
      try {
        const results = await this.ingredientsService.searchIngredientsAsync(query);
        this.searchResults.set(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        this.searchLoading.set(false);
      }
    }, 300);
  }

  selectSearchIngredient(ingredient: KnownIngredient) {
    this.searchSelectedIngredient.set(ingredient);
  }

  // Split functionality
  addSplitIngredient() {
    this.splitIngredients.update(items => [
      ...items,
      { name: '', quantity: '', unit: '', modifiers: '' }
    ]);
  }

  removeSplitIngredient(index: number) {
    this.splitIngredients.update(items => items.filter((_, i) => i !== index));
    // Clean up match tracking
    this.splitIngredientMatches.update(map => {
      const newMap = new Map(map);
      newMap.delete(index);
      return newMap;
    });
  }

  canApplySplit(): boolean {
    return this.validSplitCount() >= 2;
  }

  validSplitCount(): number {
    return this.splitIngredients().filter(s => s.name.trim()).length;
  }

  // Split quantity preview
  getSplitQuantityPreview(index: number): { valid: boolean; display: string; type: string } {
    const splitIng = this.splitIngredients()[index];
    if (!splitIng?.quantity?.trim()) {
      return { valid: false, display: '', type: '' };
    }
    return this.parseQuantityInput(splitIng.quantity);
  }

  onSplitQuantityChange(index: number) {
    // Trigger reactivity by updating the signal
    this.splitIngredients.update(items => [...items]);
  }

  // Split unit autocomplete
  getFilteredSplitUnits(index: number): KnownUnit[] {
    const splitIng = this.splitIngredients()[index];
    const query = (splitIng?.unit || '').toLowerCase();
    const units = this.allUnits();
    
    if (!query) return units.slice(0, 15);
    return units.filter(u => 
      u.name.toLowerCase().includes(query) || 
      u.abbreviation?.toLowerCase().includes(query) ||
      u.aliases?.some(a => a.toLowerCase().includes(query))
    ).slice(0, 15);
  }

  onSplitUnitChange(index: number) {
    // Trigger reactivity
    this.splitIngredients.update(items => [...items]);
  }

  // Split ingredient autocomplete and matching
  getFilteredSplitIngredients(index: number): KnownIngredient[] {
    const splitIng = this.splitIngredients()[index];
    const query = (splitIng?.name || '').toLowerCase();
    const ingredients = this.allIngredients();
    
    if (!query || query.length < 2) return [];
    return ingredients.filter(ing => 
      ing.name.toLowerCase().includes(query) ||
      ing.aliases?.some(a => a.toLowerCase().includes(query))
    ).slice(0, 10);
  }

  onSplitNameChange(index: number) {
    const splitIng = this.splitIngredients()[index];
    if (!splitIng) return;
    
    // Try to match ingredient
    const name = splitIng.name.toLowerCase().trim();
    const match = this.allIngredients().find(ing => 
      ing.name.toLowerCase() === name ||
      ing.aliases?.some(a => a.toLowerCase() === name)
    );
    
    this.splitIngredientMatches.update(map => {
      const newMap = new Map(map);
      newMap.set(index, match || null);
      return newMap;
    });
    
    // Trigger reactivity
    this.splitIngredients.update(items => [...items]);
  }

  onSplitIngredientSelected(event: any, index: number) {
    const selectedName = event.option.value;
    const match = this.allIngredients().find(ing => ing.name === selectedName);
    
    if (match) {
      this.splitIngredientMatches.update(map => {
        const newMap = new Map(map);
        newMap.set(index, match);
        return newMap;
      });
      
      // Update the name in the split ingredient
      this.splitIngredients.update(items => {
        const newItems = [...items];
        if (newItems[index]) {
          newItems[index] = { ...newItems[index], name: match.name };
        }
        return newItems;
      });
    }
  }

  getSplitIngredientMatch(index: number): KnownIngredient | null {
    return this.splitIngredientMatches().get(index) || null;
  }

  // Apply actions
  applyManual() {
    if (!this.manualName) return;

    const quantity = this.parseQuantity(this.manualQuantity);
    const modifiers = this.manualModifiers
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);

    this.dialogRef.close({
      action: 'manual',
      ingredient: {
        name: this.manualName.trim(),
        quantity,
        unit: this.manualUnit.trim() || undefined,
        modifiers: modifiers.length > 0 ? modifiers : undefined,
        knownIngredientId: this.selectedKnownIngredient()?.id,
        originalText: this.data.ingredient.originalText,
        rawLine: this.data.ingredient.rawLine,
        parsed: !!this.selectedKnownIngredient(),
      }
    } as FixIngredientDialogResult);
  }

  applyReparse() {
    const result = this.reparsedResult();
    if (!result) return;

    this.dialogRef.close({
      action: 'reparse',
      ingredient: {
        name: result.name,
        quantity: result.quantity,
        unit: result.unit,
        modifiers: result.modifiers,
        knownIngredientId: result.knownIngredientId,
        knownUnitId: result.knownUnitId,
        originalText: this.data.ingredient.originalText,
        rawLine: this.data.ingredient.rawLine,
        parsed: !!result.knownIngredientId,
      }
    } as FixIngredientDialogResult);
  }

  applySelected() {
    const selected = this.searchSelectedIngredient();
    if (!selected) return;

    this.dialogRef.close({
      action: 'select',
      ingredient: {
        name: selected.name,
        knownIngredientId: selected.id,
        originalText: this.data.ingredient.originalText,
        rawLine: this.data.ingredient.rawLine,
        quantity: this.data.ingredient.quantity,
        unit: this.data.ingredient.unit,
        modifiers: this.data.ingredient.modifiers,
        parsed: true,
      }
    } as FixIngredientDialogResult);
  }

  applySplit() {
    const validIngredients = this.splitIngredients()
      .filter(s => s.name.trim())
      .map(s => ({
        name: s.name.trim(),
        quantity: this.parseQuantity(s.quantity),
        unit: s.unit.trim() || undefined,
        modifiers: s.modifiers.split(',').map(m => m.trim()).filter(m => m.length > 0),
        originalText: this.data.ingredient.originalText,
      }));

    if (validIngredients.length < 2) return;

    this.dialogRef.close({
      action: 'split',
      splitIngredients: validIngredients,
    } as FixIngredientDialogResult);
  }

  async createAndApply() {
    if (!this.newIngredientName.trim()) return;

    this.createLoading.set(true);
    try {
      const aliases = this.newIngredientAliases
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      const newIngredient = await this.ingredientsService.createIngredient({
        name: this.newIngredientName.trim(),
        category: this.newIngredientCategory,
        aliases,
      });

      this.dialogRef.close({
        action: 'create',
        ingredient: {
          name: newIngredient.name,
          knownIngredientId: newIngredient.id,
          originalText: this.data.ingredient.originalText,
          rawLine: this.data.ingredient.rawLine,
          quantity: this.data.ingredient.quantity,
          unit: this.data.ingredient.unit,
          modifiers: this.data.ingredient.modifiers,
          parsed: true,
        },
        newKnownIngredient: newIngredient,
      } as FixIngredientDialogResult);
    } catch (error) {
      console.error('Failed to create ingredient:', error);
    } finally {
      this.createLoading.set(false);
    }
  }

  cancel() {
    this.dialogRef.close({ action: 'cancel' } as FixIngredientDialogResult);
  }

  private parseQuantity(value: string): number | string | undefined {
    if (!value || !value.trim()) return undefined;
    
    const trimmed = value.trim();
    
    // If it contains a dash, treat as a range string
    if (trimmed.includes('-')) {
      return trimmed;
    }
    
    // Handle fractions like "1/2" BEFORE trying parseFloat
    // (parseFloat("1/2") incorrectly returns 1)
    if (trimmed.includes('/')) {
      // Mixed number: "1 1/2" or "2 3/4"
      const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
      if (mixedMatch) {
        const whole = parseInt(mixedMatch[1]);
        const num = parseInt(mixedMatch[2]);
        const den = parseInt(mixedMatch[3]);
        if (den !== 0) {
          return whole + (num / den);
        }
      }
      
      // Simple fraction: "1/2", "3/4"
      const parts = trimmed.split('/');
      if (parts.length === 2) {
        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          return numerator / denominator;
        }
      }
    }
    
    // Try to parse as a simple number (no slash)
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return num;
    }
    
    return trimmed; // Return as string if can't parse
  }

  /**
   * Parse quantity input and return structured preview info
   */
  private parseQuantityInput(input: string): { valid: boolean; display: string; value: number | string | null; type: string } {
    const trimmed = input.trim();
    
    if (!trimmed) {
      return { valid: false, display: '', value: null, type: '' };
    }
    
    // Unicode fraction map
    const unicodeFractions: Record<string, number> = {
      '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75,
      '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
      '⅙': 0.167, '⅚': 0.833, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
    };
    
    // Check for unicode fractions
    for (const [frac, val] of Object.entries(unicodeFractions)) {
      if (trimmed === frac) {
        return { valid: true, display: `${val}`, value: val, type: 'fraction' };
      }
      // Mixed number with unicode: "1½" or "1 ½"
      const mixedMatch = trimmed.match(new RegExp(`^(\\d+)\\s*${frac}$`));
      if (mixedMatch) {
        const whole = parseInt(mixedMatch[1]);
        const total = whole + val;
        return { valid: true, display: `${total}`, value: total, type: 'mixed' };
      }
    }
    
    // Range pattern: "1-2" or "1 - 2" or "1 to 2"
    const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)$/i);
    if (rangeMatch) {
      const rangeStr = `${rangeMatch[1]}-${rangeMatch[2]}`;
      return { valid: true, display: `Range: ${rangeMatch[1]} to ${rangeMatch[2]}`, value: rangeStr, type: 'range' };
    }
    
    // Mixed number: "1 1/2" or "2 3/4"
    const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1]);
      const num = parseInt(mixedMatch[2]);
      const den = parseInt(mixedMatch[3]);
      if (den !== 0) {
        const total = whole + (num / den);
        return { valid: true, display: `${total} (${whole} + ${num}/${den})`, value: total, type: 'mixed' };
      }
    }
    
    // Simple fraction: "1/2", "3/4"
    const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const num = parseInt(fractionMatch[1]);
      const den = parseInt(fractionMatch[2]);
      if (den !== 0) {
        const value = num / den;
        return { valid: true, display: `${value} (${num}÷${den})`, value: value, type: 'fraction' };
      }
      return { valid: false, display: '⚠️ Division by zero', value: null, type: 'error' };
    }
    
    // Simple number
    const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
    if (numMatch) {
      const value = parseFloat(numMatch[1]);
      return { valid: true, display: `${value}`, value: value, type: 'number' };
    }
    
    // Invalid format
    return { valid: false, display: '⚠️ Unrecognized format', value: null, type: 'error' };
  }
}
