import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { RecipeService } from '../../../../core/services/recipe.service';
import { FriendService } from '../../../../core/services/friend.service';
import { AuthService } from '../../../../core/services/auth.service';
import { IngredientsKnowledgeService, KnownIngredient, KnownUnit } from '../../../../core/services/ingredients.service';
import { Recipe, AppUser, Ingredient } from '../../../../core/models';
import { debounceTime, distinctUntilChanged, switchMap, of, Observable, startWith, map } from 'rxjs';
import { 
  IngredientReviewDialogComponent, 
  IngredientReviewDialogData, 
  IngredientReviewDialogResult 
} from '../ingredient-review-dialog/ingredient-review-dialog.component';
import {
  FixIngredientDialogComponent,
  FixIngredientDialogData,
  FixIngredientDialogResult,
} from '../fix-ingredient-dialog/fix-ingredient-dialog.component';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatTooltipModule,
    DragDropModule
  ],
  template: `
    <div class="form-container">
      <header class="form-header">
        <button mat-icon-button (click)="goBack()" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>{{ isEditMode() ? 'Edit Recipe' : 'New Recipe' }}</h1>
      </header>

      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-card class="form-card">
            <mat-card-content>
              <section class="form-section">
                <h2>Basic Info</h2>

                <div class="image-upload">
                  <div class="image-preview" [style.backgroundImage]="imagePreview() ? 'url(' + imagePreview() + ')' : ''">
                    @if (!imagePreview()) {
                      <mat-icon>add_photo_alternate</mat-icon>
                      <span>Add Photo</span>
                    }
                  </div>
                  <input type="file" accept="image/*" (change)="onImageSelected($event)" #fileInput hidden>
                  <button mat-stroked-button type="button" (click)="fileInput.click()">
                    <mat-icon>upload</mat-icon>
                    {{ imagePreview() ? 'Change Image' : 'Upload Image' }}
                  </button>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Recipe Name</mat-label>
                  <input matInput formControlName="name" placeholder="Enter recipe name">
                  @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                    <mat-error>Recipe name is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="3" placeholder="Describe your recipe"></textarea>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Source URL</mat-label>
                  <input matInput formControlName="sourceUrl" placeholder="https://...">
                  <mat-icon matPrefix>link</mat-icon>
                </mat-form-field>

                <div class="time-fields">
                  <mat-form-field appearance="outline">
                    <mat-label>Prep Time</mat-label>
                    <input matInput formControlName="prepTime" placeholder="e.g., 15 minutes">
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Cook Time</mat-label>
                    <input matInput formControlName="cookTime" placeholder="e.g., 30 minutes">
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Total Time</mat-label>
                    <input matInput formControlName="totalTime" placeholder="e.g., 45 minutes">
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Servings</mat-label>
                    <input matInput type="number" formControlName="servings" min="1">
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Tags (comma separated)</mat-label>
                  <input matInput formControlName="tagsInput" placeholder="dinner, chicken, quick">
                  <mat-hint>Press comma or enter to add tags</mat-hint>
                </mat-form-field>
              </section>

              <mat-divider></mat-divider>

              <section class="form-section">
                <div class="section-header">
                  <h2>Ingredients</h2>
                  <div class="section-header-actions">
                    <button mat-button type="button" (click)="addIngredientSection()">
                      <mat-icon>bookmark</mat-icon>
                      Add Section
                    </button>
                    <button mat-button type="button" (click)="addIngredient()">
                      <mat-icon>add</mat-icon>
                      Add Ingredient
                    </button>
                  </div>
                </div>

                <div formArrayName="ingredients" cdkDropList (cdkDropListDropped)="dropIngredient($event)">
                  @for (ingredient of ingredientsArray.controls; track ingredient; let i = $index) {
                    @if (isIngredientSectionHeader(i)) {
                      <div class="section-header-row" cdkDrag [formGroupName]="i">
                        <mat-icon cdkDragHandle class="drag-handle">drag_indicator</mat-icon>
                        <mat-icon class="section-icon">bookmark</mat-icon>
                        <mat-form-field appearance="outline" class="section-name-field">
                          <mat-label>Section Name</mat-label>
                          <input matInput formControlName="section" placeholder="e.g., Dough, Filling, Topping">
                        </mat-form-field>
                        <button mat-icon-button type="button" color="warn" (click)="removeIngredient(i)" matTooltip="Remove section">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    } @else {
                      <div class="ingredient-row" cdkDrag [formGroupName]="i" 
                           [class.parsed]="getIngredientObject(i)?.parsed"
                           [class.unparsed]="getIngredientObject(i) && !getIngredientObject(i)?.parsed"
                           [class.has-section]="getCurrentSection(i)">
                        <mat-icon cdkDragHandle class="drag-handle">drag_indicator</mat-icon>
                        @if (getCurrentSection(i)) {
                          <span class="ingredient-section-badge" [matTooltip]="'Section: ' + getCurrentSection(i)">
                            {{ getCurrentSection(i) }}
                          </span>
                        }
                        <mat-form-field appearance="outline" class="ingredient-field">
                          <input matInput 
                            formControlName="text" 
                            placeholder="e.g., 2 cups flour, sifted"
                            [matAutocomplete]="ingredientAuto"
                            (input)="onIngredientInput($event, i)">
                          <mat-autocomplete #ingredientAuto="matAutocomplete" (optionSelected)="onIngredientSelected($event, i)">
                            @for (suggestion of ingredientSuggestions(); track suggestion.id) {
                              <mat-option [value]="suggestion.name">
                                <span class="suggestion-name">{{ suggestion.name }}</span>
                                <span class="suggestion-category">{{ suggestion.category }}</span>
                              </mat-option>
                            }
                          </mat-autocomplete>
                        </mat-form-field>
                        @if (isEditMode() && getIngredientObject(i)) {
                          <button mat-icon-button type="button" 
                                  [color]="getIngredientObject(i)?.parsed ? 'primary' : 'warn'"
                                  (click)="openFixIngredientDialog(i)"
                                  [matTooltip]="getIngredientObject(i)?.parsed ? 'Edit parsed ingredient' : 'Fix unparsed ingredient'">
                            <mat-icon>{{ getIngredientObject(i)?.parsed ? 'edit' : 'build' }}</mat-icon>
                          </button>
                        }
                        <button mat-icon-button type="button" color="warn" (click)="removeIngredient(i)">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    }
                    <!-- Add Ingredient button after last item in a section -->
                    @if (isLastIngredientInSection(i)) {
                      <div class="add-step-inline">
                        <button mat-stroked-button type="button" (click)="addIngredientAt(i + 1)">
                          <mat-icon>add</mat-icon>
                          Add Ingredient Here
                        </button>
                      </div>
                    }
                  }
                </div>

                @if (ingredientsArray.length === 0) {
                  <p class="empty-message">No ingredients added yet. Click "Add Ingredient" to start.</p>
                }

                <!-- Quick actions bar for ingredients -->
                <div class="quick-actions-bar">
                  <button mat-stroked-button type="button" (click)="addIngredientSection()">
                    <mat-icon>bookmark</mat-icon>
                    New Section
                  </button>
                  <button mat-stroked-button type="button" (click)="addIngredient()">
                    <mat-icon>add</mat-icon>
                    Add at End
                  </button>
                </div>
              </section>

              <mat-divider></mat-divider>

              <section class="form-section">
                <div class="section-header">
                  <h2>Instructions</h2>
                  <div class="section-header-actions">
                    <button mat-button type="button" (click)="addInstructionSection()">
                      <mat-icon>bookmark</mat-icon>
                      Add Section
                    </button>
                    <button mat-button type="button" (click)="addInstruction()">
                      <mat-icon>add</mat-icon>
                      Add Step
                    </button>
                  </div>
                </div>

                <div formArrayName="instructions" cdkDropList (cdkDropListDropped)="dropInstruction($event)">
                  @for (instruction of instructionsArray.controls; track instruction; let i = $index) {
                    @if (isInstructionSectionHeader(i)) {
                      <!-- Section Header Row -->
                      <div class="instruction-section-header-row" cdkDrag [formGroupName]="i">
                        <mat-icon cdkDragHandle class="drag-handle">drag_indicator</mat-icon>
                        <mat-icon class="section-icon">bookmark</mat-icon>
                        <mat-form-field appearance="outline" class="section-name-field">
                          <mat-label>Section Name</mat-label>
                          <input matInput formControlName="title" placeholder="e.g., For the Dough, For the Filling">
                        </mat-form-field>
                        <button mat-icon-button type="button" color="warn" (click)="removeInstruction(i)" matTooltip="Remove section">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    } @else {
                      <!-- Regular Instruction Step -->
                      <div class="instruction-row" cdkDrag [formGroupName]="i" 
                           [class.in-section]="getCurrentInstructionSection(i)">
                        <div class="instruction-header">
                          <mat-icon cdkDragHandle class="drag-handle">drag_indicator</mat-icon>
                          <span class="step-number">Step {{ getInstructionNumberInSection(i) }}</span>
                          @if (getCurrentInstructionSection(i)) {
                            <span class="instruction-section-badge">{{ getCurrentInstructionSection(i) }}</span>
                          }
                          <span class="spacer"></span>
                          <button mat-icon-button type="button" color="warn" (click)="removeInstruction(i)">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                        <mat-form-field appearance="outline" class="full-width">
                          <textarea matInput formControlName="text" rows="2" placeholder="Describe this step..."></textarea>
                        </mat-form-field>
                      </div>
                    }
                    <!-- Add Step button after last step in a section or at the end -->
                    @if (isLastStepInSection(i)) {
                      <div class="add-step-inline">
                        <button mat-stroked-button type="button" (click)="addInstructionAt(i + 1)">
                          <mat-icon>add</mat-icon>
                          Add Step Here
                        </button>
                      </div>
                    }
                  }
                </div>

                @if (instructionsArray.length === 0) {
                  <p class="empty-message">No instructions added yet. Click "Add Step" to start.</p>
                }

                <!-- Sticky bottom bar for quick actions -->
                <div class="quick-actions-bar">
                  <button mat-stroked-button type="button" (click)="addInstructionSection()">
                    <mat-icon>bookmark</mat-icon>
                    New Section
                  </button>
                  <button mat-stroked-button type="button" (click)="addInstruction()">
                    <mat-icon>add</mat-icon>
                    Add Step at End
                  </button>
                </div>
              </section>

              <mat-divider></mat-divider>

              <section class="form-section">
                <h2>Sharing</h2>

                <div class="sharing-options">
                  <mat-slide-toggle formControlName="isShared" color="primary">
                    Share with all friends
                  </mat-slide-toggle>

                  @if (!form.get('isShared')?.value && friends().length > 0) {
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Share with specific friends</mat-label>
                      <mat-select formControlName="sharedWith" multiple>
                        @for (friend of friends(); track friend.id) {
                          <mat-option [value]="friend.id">{{ friend.displayName }} ({{ friend.email }})</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  }
                </div>
              </section>
            </mat-card-content>

            <mat-card-actions align="end">
              <button mat-button type="button" routerLink="/recipes">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="saving() || form.invalid">
                @if (saving()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  {{ isEditMode() ? 'Save Changes' : 'Create Recipe' }}
                }
              </button>
            </mat-card-actions>
          </mat-card>
        </form>
      }
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    .form-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;

      h1 {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 2rem;
        color: #1a1a2e;
        margin: 0;
      }
    }

    .back-btn {
      color: #666;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 4rem;
    }

    .form-card {
      border-radius: 12px;
    }

    .form-section {
      padding: 1.5rem 0;

      h2 {
        font-size: 1.2rem;
        color: #1a1a2e;
        margin: 0 0 1.5rem 0;
      }
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      h2 {
        margin: 0;
      }
    }

    .section-header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .section-header-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-left: 4px solid #e94560;

      .section-icon {
        color: #e94560;
      }

      .section-name-field {
        flex: 1;
      }
    }

    .ingredient-section-badge {
      font-size: 0.7rem;
      background: #e94560;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      white-space: nowrap;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .full-width {
      width: 100%;
    }

    .image-upload {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;

      .image-preview {
        width: 100%;
        max-width: 400px;
        aspect-ratio: 16/9;
        background: #f5f5f5;
        border-radius: 12px;
        background-size: cover;
        background-position: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #999;
        gap: 0.5rem;
        border: 2px dashed #ddd;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }
    }

    .time-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .ingredient-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      background: white;
      padding: 0.5rem;
      border-radius: 8px;
      border-left: 3px solid transparent;

      &:hover {
        background: #fafafa;
      }

      &.parsed {
        border-left-color: #4caf50;
      }

      &.unparsed {
        border-left-color: #ff9800;
        background: #fff8e1;
      }

      .ingredient-field {
        flex: 1;
      }
    }

    .instruction-section-header-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-left: 4px solid #e94560;

      .section-icon {
        color: #e94560;
      }

      .section-name-field {
        flex: 1;
        
        ::ng-deep .mat-mdc-text-field-wrapper {
          background: rgba(255, 255, 255, 0.1);
        }
        
        ::ng-deep .mat-mdc-form-field-flex {
          background: transparent;
        }
        
        ::ng-deep input {
          color: white !important;
        }
        
        ::ng-deep .mat-mdc-floating-label {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        
        ::ng-deep .mdc-notched-outline__leading,
        ::ng-deep .mdc-notched-outline__notch,
        ::ng-deep .mdc-notched-outline__trailing {
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
      }

      button[color="warn"] {
        color: rgba(255, 255, 255, 0.8);
      }
    }

    .instruction-row {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid #eee;

      &:hover {
        border-color: #ddd;
      }

      &.in-section {
        margin-left: 1.5rem;
        border-left: 3px solid #e94560;
      }

      .spacer {
        flex: 1;
      }

      .instruction-section-badge {
        font-size: 0.7rem;
        background: #e94560;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        white-space: nowrap;
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .instruction-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;

      .step-number {
        font-weight: 600;
        color: #e94560;
      }
    }

    .add-step-inline {
      display: flex;
      justify-content: center;
      margin: 0.5rem 0 1rem 0;
      padding: 0.5rem;
      border: 2px dashed #ddd;
      border-radius: 8px;
      background: #fafafa;

      button {
        color: #666;
        
        mat-icon {
          margin-right: 0.25rem;
        }
      }

      &:hover {
        border-color: #e94560;
        background: #fef8f9;
        
        button {
          color: #e94560;
        }
      }
    }

    .quick-actions-bar {
      display: flex;
      justify-content: center;
      gap: 1rem;
      padding: 1rem;
      margin-top: 1rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 8px;
      border: 1px solid #dee2e6;
      position: sticky;
      bottom: 0;
      z-index: 10;

      button {
        mat-icon {
          margin-right: 0.25rem;
        }
      }
    }

    .drag-handle {
      cursor: move;
      color: #ccc;

      &:hover {
        color: #999;
      }
    }

    .empty-message {
      color: #999;
      text-align: center;
      padding: 2rem;
      background: #fafafa;
      border-radius: 8px;
      margin: 0;
    }

    .sharing-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    mat-card-actions {
      padding: 1rem 1.5rem !important;
      gap: 1rem;
    }

    .cdk-drag-preview {
      background: white;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      border-radius: 8px;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
    }

    .suggestion-name {
      font-weight: 500;
    }

    .suggestion-category {
      font-size: 0.8rem;
      color: #888;
      margin-left: 0.5rem;
      text-transform: capitalize;
    }

    @media (max-width: 600px) {
      .form-container {
        padding: 1rem;
      }

      .form-header {
        h1 {
          font-size: 1.5rem;
        }
      }

      .time-fields {
        grid-template-columns: 1fr 1fr;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .section-header-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .section-header-row,
      .instruction-section-header-row {
        flex-wrap: wrap;
      }

      .section-name-field {
        flex: 1 1 100%;
        min-width: 150px;
      }

      .ingredient-row {
        flex-wrap: wrap;
      }

      .ingredient-field {
        flex: 1 1 100%;
        min-width: 200px;
      }

      .ingredient-section-badge {
        max-width: 60px;
        font-size: 0.6rem;
      }

      .instruction-row {
        padding: 0.75rem;

        &.in-section {
          margin-left: 0.5rem;
        }
      }

      .instruction-header {
        flex-wrap: wrap;
      }

      .quick-actions-bar {
        flex-direction: column;
        gap: 0.5rem;

        button {
          width: 100%;
        }
      }

      .add-step-inline {
        button {
          font-size: 0.8rem;
        }
      }

      .image-upload {
        .image-preview {
          aspect-ratio: 4/3;
        }
      }
    }
  `]
})
export class RecipeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private recipeService = inject(RecipeService);
  private friendService = inject(FriendService);
  private authService = inject(AuthService);
  private ingredientsService = inject(IngredientsKnowledgeService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  form: FormGroup;
  loading = signal(true);
  saving = signal(false);
  isEditMode = signal(false);
  imagePreview = signal<string | null>(null);
  imageFile = signal<File | null>(null);
  friends = signal<AppUser[]>([]);
  ingredientSuggestions = signal<KnownIngredient[]>([]);
  knownUnits = signal<KnownUnit[]>([]);
  
  // Store full ingredient objects for editing (preserves parsed data)
  ingredientObjects = signal<Ingredient[]>([]);
  
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  private recipeId: string | null = null;
  private recipeName: string = '';

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      sourceUrl: [''],
      prepTime: [''],
      cookTime: [''],
      totalTime: [''],
      servings: [null],
      tagsInput: [''],
      isShared: [false],
      sharedWith: [[]],
      ingredients: this.fb.array([]),
      instructions: this.fb.array([])
    });
  }

  get ingredientsArray(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  get instructionsArray(): FormArray {
    return this.form.get('instructions') as FormArray;
  }

  async ngOnInit(): Promise<void> {
    this.recipeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(!!this.recipeId);

    // Load friends for sharing
    try {
      const friends = await this.friendService.getFriends();
      this.friends.set(friends);
    } catch (e) {
      console.error('Failed to load friends:', e);
    }

    if (this.isEditMode() && this.recipeId) {
      try {
        const recipe = await this.recipeService.getRecipe(this.recipeId);
        if (recipe) {
          this.populateForm(recipe);
        } else {
          this.router.navigate(['/recipes']);
        }
      } catch (e) {
        console.error('Failed to load recipe:', e);
        this.snackBar.open('Failed to load recipe', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/recipes']);
      }
    } else {
      // Add initial empty ingredient and instruction
      this.addIngredient();
      this.addInstruction();
    }

    this.loading.set(false);
  }

  private populateForm(recipe: Recipe): void {
    this.recipeName = recipe.name;
    
    this.form.patchValue({
      name: recipe.name,
      description: recipe.description,
      sourceUrl: recipe.sourceUrl,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime,
      servings: recipe.servings,
      tagsInput: recipe.tags?.join(', ') || '',
      isShared: recipe.isShared,
      sharedWith: recipe.sharedWith || []
    });

    if (recipe.imageUrl) {
      this.imagePreview.set(recipe.imageUrl);
    }

    // Populate ingredients - store full objects for editing
    // Group by section and insert section headers
    const ingredientsCopy: Ingredient[] = [];
    let currentSection: string | undefined;
    
    recipe.ingredients.forEach((ing) => {
      // If this ingredient starts a new section, add a section header row first
      if (ing.section && ing.section !== currentSection) {
        this.ingredientsArray.push(this.fb.group({
          text: [''],
          section: [ing.section],
          isSection: [true]
        }));
        // Don't add section headers to ingredientObjects - they're just UI elements
        currentSection = ing.section;
      }
      
      this.ingredientsArray.push(this.fb.group({
        text: [ing.originalText || `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()],
        section: [''],
        isSection: [false]
      }));
      ingredientsCopy.push({ ...ing });
    });
    this.ingredientObjects.set(ingredientsCopy);

    // Populate instructions - group by section and insert section headers
    let currentInstructionSection: string | undefined;
    recipe.instructions.forEach(inst => {
      // If this instruction starts a new section, add a section header row first
      if (inst.title && inst.title !== currentInstructionSection) {
        this.instructionsArray.push(this.fb.group({
          text: [''],
          title: [inst.title],
          isSection: [true]
        }));
        currentInstructionSection = inst.title;
      }
      
      this.instructionsArray.push(this.fb.group({
        text: [inst.text],
        title: [''],
        isSection: [false]
      }));
    });
  }

  addIngredient(): void {
    this.ingredientsArray.push(this.fb.group({ text: [''], section: [''], isSection: [false] }));
  }

  addIngredientSection(): void {
    this.ingredientsArray.push(this.fb.group({ text: [''], section: [''], isSection: [true] }));
  }

  isIngredientSectionHeader(index: number): boolean {
    const control = this.ingredientsArray.at(index);
    return control?.get('isSection')?.value === true;
  }

  getCurrentSection(index: number): string | null {
    // Walk backwards from current index to find the nearest section header
    for (let i = index - 1; i >= 0; i--) {
      if (this.isIngredientSectionHeader(i)) {
        return this.ingredientsArray.at(i).get('section')?.value || null;
      }
    }
    return null;
  }

  // Convert form array index to ingredientObjects index (skipping section headers)
  getIngredientObjectIndex(formIndex: number): number {
    let objectIndex = 0;
    for (let i = 0; i < formIndex; i++) {
      if (!this.isIngredientSectionHeader(i)) {
        objectIndex++;
      }
    }
    return objectIndex;
  }

  // Get the ingredient object for a form index (handles section header offset)
  getIngredientObject(formIndex: number): Ingredient | undefined {
    if (this.isIngredientSectionHeader(formIndex)) {
      return undefined;
    }
    const objectIndex = this.getIngredientObjectIndex(formIndex);
    return this.ingredientObjects()[objectIndex];
  }

  removeIngredient(index: number): void {
    // If removing an actual ingredient (not a section header), also remove from ingredientObjects
    if (!this.isIngredientSectionHeader(index)) {
      const objectIndex = this.getIngredientObjectIndex(index);
      const objects = this.ingredientObjects();
      if (objects.length > objectIndex) {
        objects.splice(objectIndex, 1);
        this.ingredientObjects.set([...objects]);
      }
    }
    this.ingredientsArray.removeAt(index);
    // Also remove from ingredientObjects
    const objects = this.ingredientObjects();
    if (objects.length > index) {
      objects.splice(index, 1);
      this.ingredientObjects.set([...objects]);
    }
  }

  async openFixIngredientDialog(formIndex: number): Promise<void> {
    // Convert form index to ingredientObjects index (accounting for section headers)
    const objectIndex = this.getIngredientObjectIndex(formIndex);
    const ingredient = this.ingredientObjects()[objectIndex];
    if (!ingredient) return;

    const dialogRef = this.dialog.open(FixIngredientDialogComponent, {
      data: {
        ingredient,
        ingredientIndex: objectIndex,
        recipeId: this.recipeId || '',
        recipeName: this.recipeName || this.form.get('name')?.value || 'Recipe',
      } as FixIngredientDialogData,
      width: '600px',
      maxHeight: '90vh',
    });

    const result = await dialogRef.afterClosed().toPromise() as FixIngredientDialogResult | undefined;

    if (!result || result.action === 'cancel') {
      return;
    }

    // Handle split action
    if (result.action === 'split' && result.splitIngredients) {
      const objects = this.ingredientObjects();
      // Remove the original ingredient from objects
      objects.splice(objectIndex, 1);
      // Remove from form array
      this.ingredientsArray.removeAt(formIndex);

      // Add split ingredients
      result.splitIngredients.forEach((splitIng, i) => {
        const newIngredient: Ingredient = {
          name: splitIng.name,
          quantity: splitIng.quantity,
          unit: splitIng.unit,
          modifiers: splitIng.modifiers,
          originalText: splitIng.originalText,
          parsed: true, // Mark as parsed since user manually split
        };
        objects.splice(objectIndex + i, 0, newIngredient);
        this.ingredientsArray.insert(formIndex + i, this.fb.group({
          text: [splitIng.originalText],
          section: [''],
          isSection: [false]
        }));
      });

      this.ingredientObjects.set([...objects]);
      this.snackBar.open('Ingredient split successfully', 'Dismiss', { duration: 2000 });
      return;
    }

    // Handle other actions (reparse, select, manual, create)
    if (result.ingredient) {
      const objects = this.ingredientObjects();
      const updatedIngredient: Ingredient = {
        ...objects[objectIndex],
        ...result.ingredient,
        parsed: true, // Mark as parsed
      };
      objects[objectIndex] = updatedIngredient;
      this.ingredientObjects.set([...objects]);

      // Update the text field to show the updated ingredient
      const displayText = this.formatIngredientDisplay(updatedIngredient);
      this.ingredientsArray.at(formIndex).get('text')?.setValue(displayText);

      this.snackBar.open('Ingredient updated', 'Dismiss', { duration: 2000 });
    }
  }

  private formatIngredientDisplay(ing: Ingredient): string {
    const parts: string[] = [];
    if (ing.quantity) parts.push(String(ing.quantity));
    if (ing.unit) parts.push(ing.unit);
    if (ing.name) parts.push(ing.name);
    if (ing.modifiers?.length) parts.push(`(${ing.modifiers.join(', ')})`);
    return parts.join(' ') || ing.originalText;
  }

  addInstruction(): void {
    this.instructionsArray.push(this.fb.group({ text: [''], title: [''], isSection: [false] }));
  }

  addInstructionSection(): void {
    // Add a section header (has title, no text, marked as section)
    this.instructionsArray.push(this.fb.group({ text: [''], title: ['New Section'], isSection: [true] }));
  }

  isInstructionSectionHeader(index: number): boolean {
    const control = this.instructionsArray.at(index);
    return control?.get('isSection')?.value === true;
  }

  getCurrentInstructionSection(index: number): string | null {
    // Walk backwards from current index to find the nearest section header
    for (let i = index - 1; i >= 0; i--) {
      if (this.isInstructionSectionHeader(i)) {
        return this.instructionsArray.at(i).get('title')?.value || null;
      }
    }
    return null;
  }

  getInstructionNumberInSection(index: number): number {
    // Count steps from the last section header (or start) to this index
    let stepNum = 0;
    let startIndex = 0;
    
    // Find the last section header before this index
    for (let i = index - 1; i >= 0; i--) {
      if (this.isInstructionSectionHeader(i)) {
        startIndex = i + 1;
        break;
      }
    }
    
    // Count non-section steps from startIndex to index (inclusive)
    for (let i = startIndex; i <= index; i++) {
      if (!this.isInstructionSectionHeader(i)) {
        stepNum++;
      }
    }
    
    return stepNum || 1;
  }

  removeInstruction(index: number): void {
    this.instructionsArray.removeAt(index);
  }

  isLastStepInSection(index: number): boolean {
    // Check if this is the last step before a section header or the end
    const nextIndex = index + 1;
    
    // If this is a section header, it's not a "step" so return false
    if (this.isInstructionSectionHeader(index)) {
      return false;
    }
    
    // If we're at the end, return true
    if (nextIndex >= this.instructionsArray.length) {
      return true;
    }
    
    // If the next item is a section header, this is the last step in current section
    return this.isInstructionSectionHeader(nextIndex);
  }

  addInstructionAt(index: number): void {
    const newControl = this.fb.group({ text: [''], title: [''], isSection: [false] });
    this.instructionsArray.insert(index, newControl);
  }

  isLastIngredientInSection(index: number): boolean {
    // Check if this is the last ingredient before a section header or the end
    const nextIndex = index + 1;
    
    // If this is a section header, it's not an "ingredient" so return false
    if (this.isIngredientSectionHeader(index)) {
      return false;
    }
    
    // If we're at the end, return true
    if (nextIndex >= this.ingredientsArray.length) {
      return true;
    }
    
    // If the next item is a section header, this is the last ingredient in current section
    return this.isIngredientSectionHeader(nextIndex);
  }

  addIngredientAt(index: number): void {
    const newControl = this.fb.group({ text: [''], section: [''], isSection: [false] });
    this.ingredientsArray.insert(index, newControl);
  }

  dropIngredient(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.ingredientsArray.controls, event.previousIndex, event.currentIndex);
  }

  dropInstruction(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.instructionsArray.controls, event.previousIndex, event.currentIndex);
  }

  onIngredientInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Extract the ingredient name part (after quantity and unit)
    // Simple extraction - look for the last word or two
    const words = value.split(' ');
    let searchTerm = '';
    
    // Try to find ingredient name by looking at words that aren't numbers or common units
    const unitPatterns = /^(cups?|c|tablespoons?|tbsp?|teaspoons?|tsp?|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|l|pinch|dash|cloves?|heads?|bunch|slices?|pieces?|cans?|packages?|sticks?)$/i;
    
    for (const word of words) {
      if (!word.match(/^[\d\/\.]+$/) && !word.match(unitPatterns)) {
        searchTerm += (searchTerm ? ' ' : '') + word;
      }
    }
    
    if (searchTerm.length >= 2) {
      this.searchTimeout = setTimeout(() => {
        this.ingredientsService.searchIngredients(searchTerm).subscribe({
          next: (results) => {
            this.ingredientSuggestions.set(results);
          },
          error: (err) => {
            console.error('Failed to search ingredients:', err);
            this.ingredientSuggestions.set([]);
          }
        });
      }, 300);
    } else {
      this.ingredientSuggestions.set([]);
    }
  }

  onIngredientSelected(event: any, index: number): void {
    const selectedName = event.option.value;
    const control = this.ingredientsArray.at(index).get('text');
    const currentValue = control?.value || '';
    
    // Extract quantity and unit from current value
    const match = currentValue.match(/^([\d\s\/\.]+)?\s*(\w+)?\s*/);
    const quantity = match?.[1]?.trim() || '';
    const unit = match?.[2]?.trim() || '';
    
    // Check if the unit is actually a unit
    const unitPatterns = /^(cups?|c|tablespoons?|tbsp?|teaspoons?|tsp?|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|l|pinch|dash|cloves?|heads?|bunch|slices?|pieces?|cans?|packages?|sticks?)$/i;
    
    let newValue = '';
    if (quantity && unit && unit.match(unitPatterns)) {
      newValue = `${quantity} ${unit} ${selectedName}`;
    } else if (quantity) {
      newValue = `${quantity} ${selectedName}`;
    } else {
      newValue = selectedName;
    }
    
    control?.setValue(newValue);
    this.ingredientSuggestions.set([]);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.imageFile.set(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const formValue = this.form.value;

    // Build ingredient texts with section context
    // Track current section as we go through ingredients
    let currentSection: string | undefined;
    const ingredientData: Array<{ text: string; section?: string }> = [];
    
    for (const ing of formValue.ingredients) {
      if (ing.isSection) {
        // This is a section header - update current section
        currentSection = ing.section?.trim() || undefined;
      } else if (ing.text?.trim()) {
        // This is an actual ingredient - assign current section
        ingredientData.push({
          text: ing.text.trim(),
          section: currentSection
        });
      }
    }

    const ingredientTexts = ingredientData.map(d => d.text);

    // In edit mode, use the stored ingredient objects (which may have been fixed)
    if (this.isEditMode() && this.ingredientObjects().length > 0) {
      // Sync any text changes with the ingredient objects and apply sections
      let formIdx = 0;
      const ingredients: Ingredient[] = [];
      
      for (let i = 0; i < formValue.ingredients.length; i++) {
        const formItem = formValue.ingredients[i];
        if (formItem.isSection) {
          // Update current section
          currentSection = formItem.section?.trim() || undefined;
        } else {
          // Find corresponding stored ingredient
          const storedIng = this.ingredientObjects()[formIdx];
          if (storedIng && storedIng.name) {
            const formText = formItem.text?.trim();
            const updatedIng = { ...storedIng, section: currentSection };
            // If the text has changed from the original, update the originalText
            if (formText && formText !== storedIng.originalText) {
              updatedIng.originalText = formText;
            }
            ingredients.push(updatedIng);
          }
          formIdx++;
        }
      }
      await this.saveRecipe(ingredients);
      return;
    }

    // For new recipes (or if no ingredient objects stored), use the review dialog
    if (ingredientTexts.length > 0) {
      const dialogRef = this.dialog.open(IngredientReviewDialogComponent, {
        data: {
          recipeName: formValue.name,
          ingredientTexts,
        } as IngredientReviewDialogData,
        width: '650px',
        maxHeight: '90vh',
        disableClose: true,
        panelClass: 'centered-dialog',
        position: { top: '5vh' },
      });

      const result = await dialogRef.afterClosed().toPromise() as IngredientReviewDialogResult | undefined;

      if (!result || result.action === 'cancel') {
        return; // User cancelled
      }

      // Apply sections to the reviewed ingredients
      const ingredientsWithSections = (result.ingredients || []).map((ing, idx) => ({
        ...ing,
        section: ingredientData[idx]?.section
      }));

      await this.saveRecipe(ingredientsWithSections);
    } else {
      // No ingredients, save directly
      await this.saveRecipe([]);
    }
  }

  private async saveRecipe(ingredients: Ingredient[]): Promise<void> {
    this.saving.set(true);

    try {
      const formValue = this.form.value;

      // Parse tags from comma-separated string
      const tags = formValue.tagsInput
        ? formValue.tagsInput.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : [];

      // Parse instructions with section titles
      // Section headers (isSection=true) set the title for subsequent steps
      let instructionPosition = 0;
      let currentSectionTitle: string | undefined;
      const instructions: Array<{ position: number; text: string; title?: string }> = [];
      
      for (const inst of formValue.instructions) {
        if (inst.isSection) {
          // This is a section header - update current section title
          currentSectionTitle = inst.title?.trim() || undefined;
        } else if (inst.text?.trim()) {
          // This is an actual instruction step
          instructions.push({
            position: instructionPosition++,
            text: inst.text.trim(),
            title: currentSectionTitle  // Apply current section title
          });
          // Only the first instruction in a section gets the title
          currentSectionTitle = undefined;
        }
      }

      // Check if any ingredients are unparsed
      const hasUnparsedIngredients = ingredients.some(ing => !ing.parsed);

      const recipeData: Partial<Recipe> = {
        name: formValue.name,
        description: formValue.description,
        sourceUrl: formValue.sourceUrl,
        prepTime: formValue.prepTime,
        cookTime: formValue.cookTime,
        totalTime: formValue.totalTime,
        servings: formValue.servings,
        tags,
        isShared: formValue.isShared,
        sharedWith: formValue.sharedWith || [],
        ingredients,
        instructions,
        imageUrl: this.imagePreview() || undefined,
        hasUnparsedIngredients,
      };

      if (this.isEditMode() && this.recipeId) {
        await this.recipeService.updateRecipe(this.recipeId, recipeData, this.imageFile() || undefined);
        this.snackBar.open('Recipe updated!', 'Dismiss', { duration: 3000 });
      } else {
        await this.recipeService.createRecipe(recipeData, this.imageFile() || undefined);
        this.snackBar.open('Recipe created!', 'Dismiss', { duration: 3000 });
      }

      this.router.navigate(['/recipes']);
    } catch (e) {
      console.error('Failed to save recipe:', e);
      this.snackBar.open('Failed to save recipe', 'Dismiss', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  goBack(): void {
    this.location.back();
  }
}

