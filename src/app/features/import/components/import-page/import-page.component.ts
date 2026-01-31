import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { environment } from '../../../../../environments/environment';
import { RecipeService, MealieImportRecipe } from '../../../../core/services/recipe.service';
import { MealieUsersService, MealieUserImportDto } from '../../../../core/services/mealie-users.service';
import { Recipe, Ingredient } from '../../../../core/models';
import { firstValueFrom } from 'rxjs';
import { 
  IngredientReviewDialogComponent, 
  IngredientReviewDialogData, 
  IngredientReviewDialogResult 
} from '../../../recipes/components/ingredient-review-dialog/ingredient-review-dialog.component';

interface MealieRecipe {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: number;
  sourceUrl?: string;
  ingredients: Array<{ display: string; original_text?: string; section?: string }>;
  instructions: Array<{ text: string | null; position: number; title?: string }>;
  tags?: string[];
  imageData?: Blob;  // For storing extracted image
  selected?: boolean;
  originalMealieUserId?: string;  // Original Mealie user who created this recipe
  originalMealieUserName?: string; // For display in the UI
}

@Component({
  selector: 'app-import-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTabsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatDialogModule
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Import Recipes</h1>
        <p class="subtitle">Import recipes from URLs or Mealie backups</p>
      </header>

      <mat-tab-group>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>link</mat-icon>
            <span>From URL</span>
          </ng-template>

          <div class="tab-content">
            <mat-card class="import-card">
              <mat-card-content>
                <h3>Import from Website</h3>
                <p class="description">
                  Enter a recipe URL and we'll automatically extract the recipe details using Schema.org format.
                </p>

                <div class="url-form">
                  <mat-form-field appearance="outline" class="url-field">
                    <mat-label>Recipe URL</mat-label>
                    <input matInput [(ngModel)]="importUrl" placeholder="https://example.com/recipe">
                    <mat-icon matPrefix>link</mat-icon>
                  </mat-form-field>
                  <button mat-raised-button color="primary" (click)="importFromUrl()" [disabled]="importingUrl() || !importUrl">
                    @if (importingUrl()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <ng-container>
                        <mat-icon>cloud_download</mat-icon>
                        Import
                      </ng-container>
                    }
                  </button>
                </div>

                @if (urlError()) {
                  <p class="error-message">{{ urlError() }}</p>
                }

                @if (urlSuccess()) {
                  <p class="success-message">{{ urlSuccess() }}</p>
                }

                <div class="supported-sites">
                  <h4>Supported Sites</h4>
                  <p>Any website using Schema.org/Recipe JSON-LD format, including:</p>
                  <ul>
                    <li>AllRecipes</li>
                    <li>Food Network</li>
                    <li>Serious Eats</li>
                    <li>Bon Appétit</li>
                    <li>And many more...</li>
                  </ul>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>folder_zip</mat-icon>
            <span>From Mealie</span>
          </ng-template>

          <div class="tab-content">
            <mat-card class="import-card">
              <mat-card-content>
                <h3>Import from Mealie Backup</h3>
                <p class="description">
                  Upload a Mealie backup ZIP file to import all your recipes.
                </p>

                <div class="file-upload">
                  <div class="drop-zone" [class.drag-over]="dragOver()" (dragover)="onDragOver($event)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
                    <mat-icon>cloud_upload</mat-icon>
                    <p>Drag and drop your Mealie backup ZIP file here</p>
                    <span>or</span>
                    <button mat-stroked-button (click)="fileInput.click()">
                      Choose File
                    </button>
                    <input type="file" accept=".zip" (change)="onFileSelected($event)" #fileInput hidden>
                  </div>

                  @if (selectedFile()) {
                    <div class="selected-file">
                      <mat-icon>description</mat-icon>
                      <span>{{ selectedFile()?.name }}</span>
                      <button mat-icon-button (click)="clearFile()">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  }
                </div>

                @if (parsingMealie()) {
                  <div class="parsing-status">
                    <mat-spinner diameter="32"></mat-spinner>
                    <p>Parsing Mealie backup...</p>
                  </div>
                }

                @if (mealieRecipes().length > 0) {
                  <mat-divider></mat-divider>

                  <div class="mealie-recipes">
                    <div class="recipes-header">
                      <h4>Found {{ mealieRecipes().length }} Recipes</h4>
                      <div>
                        <button mat-button (click)="selectAllMealie()">Select All</button>
                        <button mat-button (click)="deselectAllMealie()">Deselect All</button>
                      </div>
                    </div>

                    <div class="recipe-list">
                      @for (recipe of mealieRecipes(); track recipe.id) {
                        <div class="recipe-item">
                          <mat-checkbox [(ngModel)]="recipe.selected" color="primary">
                            {{ recipe.name }}
                          </mat-checkbox>
                        </div>
                      }
                    </div>

                    <div class="button-row">
                      <button mat-stroked-button color="accent" (click)="previewMealieImport()" [disabled]="importingMealie() || getSelectedCount() === 0">
                        <mat-icon>visibility</mat-icon>
                        Preview Ingredients
                      </button>
                      <button mat-raised-button color="primary" class="import-btn" (click)="importSelectedMealie()" [disabled]="importingMealie() || getSelectedCount() === 0">
                        @if (importingMealie()) {
                          <ng-container>
                            <mat-spinner diameter="20"></mat-spinner>
                            Importing...
                          </ng-container>
                        } @else {
                          <ng-container>
                            <mat-icon>cloud_download</mat-icon>
                            Import {{ getSelectedCount() }} Recipe(s)
                          </ng-container>
                        }
                      </button>
                    </div>

                    @if (importingMealie()) {
                      <mat-progress-bar mode="determinate" [value]="importProgress()"></mat-progress-bar>
                      <p class="progress-text">Imported {{ importedCount() }} of {{ getSelectedCount() }}</p>
                    }
                  </div>
                }

                @if (mealieError()) {
                  <p class="error-message">{{ mealieError() }}</p>
                }

                @if (mealieSuccess()) {
                  <p class="success-message">{{ mealieSuccess() }}</p>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        @if (showDevTools) {
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>delete_sweep</mat-icon>
              <span>Dev Tools</span>
            </ng-template>

            <div class="tab-content">
              <mat-card class="import-card danger-zone">
                <mat-card-content>
                  <h3>⚠️ Danger Zone</h3>
                  <p class="description">
                    These actions are destructive and cannot be undone. Use with caution!
                  </p>

                  <div class="danger-actions">
                    <button mat-raised-button color="warn" (click)="deleteAllRecipes()" [disabled]="deletingAll()">
                      @if (deletingAll()) {
                        <mat-spinner diameter="20"></mat-spinner>
                        Deleting...
                      } @else {
                        <ng-container>
                          <mat-icon>delete_forever</mat-icon>
                          Delete All My Recipes
                        </ng-container>
                      }
                    </button>

                    @if (deleteError()) {
                      <p class="error-message">{{ deleteError() }}</p>
                    }

                    @if (deleteSuccess()) {
                      <p class="success-message">{{ deleteSuccess() }}</p>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>
        }
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;

      h1 {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 2.5rem;
        color: #1a1a2e;
        margin: 0 0 0.5rem 0;
      }

      .subtitle {
        color: #666;
        margin: 0;
      }
    }

    .tab-content {
      padding: 1.5rem 0;
    }

    .import-card {
      border-radius: 12px;

      h3 {
        margin: 0 0 0.5rem 0;
        color: #1a1a2e;
      }

      .description {
        color: #666;
        margin: 0 0 1.5rem 0;
      }
    }

    .url-form {
      display: flex;
      gap: 1rem;
      align-items: flex-start;

      .url-field {
        flex: 1;
      }

      button {
        height: 56px;
        background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
      }
    }

    .error-message {
      color: #c62828;
      margin: 1rem 0 0 0;
      font-size: 0.875rem;
    }

    .success-message {
      color: #2e7d32;
      margin: 1rem 0 0 0;
      font-size: 0.875rem;
    }

    .supported-sites {
      margin-top: 2rem;
      padding: 1rem;
      background: #f9f9f9;
      border-radius: 8px;

      h4 {
        margin: 0 0 0.5rem 0;
        color: #1a1a2e;
      }

      p {
        margin: 0 0 0.5rem 0;
        color: #666;
        font-size: 0.875rem;
      }

      ul {
        margin: 0;
        padding-left: 1.5rem;
        color: #666;
        font-size: 0.875rem;
      }
    }

    .file-upload {
      margin-bottom: 1.5rem;
    }

    .drop-zone {
      border: 2px dashed #ddd;
      border-radius: 12px;
      padding: 3rem;
      text-align: center;
      transition: all 0.2s ease;
      cursor: pointer;

      &:hover, &.drag-over {
        border-color: #e94560;
        background: rgba(233, 69, 96, 0.05);
      }

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #ccc;
      }

      p {
        margin: 1rem 0 0.5rem 0;
        color: #666;
      }

      span {
        color: #999;
        font-size: 0.875rem;
        display: block;
        margin-bottom: 0.5rem;
      }
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background: #f5f5f5;
      border-radius: 8px;

      mat-icon {
        color: #e94560;
      }

      span {
        flex: 1;
      }
    }

    .parsing-status {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      gap: 1rem;

      p {
        color: #666;
        margin: 0;
      }
    }

    .mealie-recipes {
      padding-top: 1.5rem;
    }

    .recipes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      h4 {
        margin: 0;
        color: #1a1a2e;
      }
    }

    .recipe-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #eee;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .recipe-item {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #fafafa;
      }
    }

    .button-row {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
      
      button {
        flex: 1;
        height: 48px;
      }
    }

    .import-btn {
      background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
    }

    mat-progress-bar {
      margin-top: 1rem;
    }

    .progress-text {
      text-align: center;
      color: #666;
      font-size: 0.875rem;
      margin: 0.5rem 0 0 0;
    }

    mat-tab-group {
      background: white;
      border-radius: 12px;
      overflow: hidden;
    }

    ::ng-deep .mat-mdc-tab-labels {
      background: #f5f5f5;
    }

    ::ng-deep .mat-mdc-tab {
      mat-icon {
        margin-right: 8px;
      }
    }

    .danger-zone {
      border: 2px solid #c62828;
      background: #fff5f5;

      h3 {
        color: #c62828;
      }
    }

    .danger-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;

      button {
        mat-icon {
          margin-right: 8px;
        }
      }
    }

    @media (max-width: 600px) {
      .page-container {
        padding: 1rem;
      }

      .page-header {
        h1 {
          font-size: 1.75rem;
        }
      }

      .url-form {
        flex-direction: column;

        button {
          width: 100%;
        }
      }

      .drop-zone {
        padding: 1.5rem;

        mat-icon {
          font-size: 36px;
          width: 36px;
          height: 36px;
        }
      }

      .button-row {
        flex-direction: column;
        
        button {
          width: 100%;
        }
      }

      .recipes-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .recipe-list {
        max-height: 250px;
      }

      .import-card {
        h3 {
          font-size: 1.1rem;
        }
      }

      .tab-content {
        padding: 1rem 0;
      }

      ::ng-deep .mat-mdc-tab {
        min-width: 0;
        padding: 0 12px;

        mat-icon {
          margin-right: 4px;
        }
      }

      .danger-actions {
        width: 100%;

        button {
          width: 100%;
        }
      }
    }
  `]
})
export class ImportPageComponent {
  private http = inject(HttpClient);
  private recipeService = inject(RecipeService);
  private mealieUsersService = inject(MealieUsersService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  // URL Import
  importUrl = '';
  importingUrl = signal(false);
  urlError = signal<string | null>(null);
  urlSuccess = signal<string | null>(null);

  // Mealie Import
  dragOver = signal(false);
  selectedFile = signal<File | null>(null);
  parsingMealie = signal(false);
  mealieRecipes = signal<MealieRecipe[]>([]);
  mealieUsers = signal<MealieUserImportDto[]>([]); // Extracted Mealie users
  mealieError = signal<string | null>(null);
  mealieSuccess = signal<string | null>(null);
  importingMealie = signal(false);
  importProgress = signal(0);
  importedCount = signal(0);

  // Delete All
  deletingAll = signal(false);
  deleteError = signal<string | null>(null);
  deleteSuccess = signal<string | null>(null);

  // Dev tools - set to true to show dangerous dev tools
  showDevTools = false;

  async importFromUrl(): Promise<void> {
    if (!this.importUrl.trim()) return;

    this.importingUrl.set(true);
    this.urlError.set(null);
    this.urlSuccess.set(null);

    try {
      // Step 1: Preview - fetch and parse recipe without saving
      const preview = await this.http.post<{
        recipe: Partial<Recipe>;
        ingredientTexts: string[];
      }>(
        `${environment.apiUrl}/import/url/preview`,
        { url: this.importUrl }
      ).toPromise();

      if (!preview) {
        throw new Error('No recipe data returned');
      }

      // Step 2: If there are ingredients, show the review dialog
      let ingredients: Ingredient[] = [];
      
      if (preview.ingredientTexts.length > 0) {
        const dialogRef = this.dialog.open(IngredientReviewDialogComponent, {
          data: {
            recipeName: preview.recipe.name || 'Imported Recipe',
            ingredientTexts: preview.ingredientTexts,
          } as IngredientReviewDialogData,
          width: '650px',
          maxHeight: '90vh',
          disableClose: true,
          panelClass: 'centered-dialog',
          position: { top: '5vh' },
        });

        const result = await dialogRef.afterClosed().toPromise() as IngredientReviewDialogResult | undefined;

        if (!result || result.action === 'cancel') {
          this.importingUrl.set(false);
          return; // User cancelled
        }

        ingredients = result.ingredients || [];
      }

      // Step 3: Create the recipe with the reviewed ingredients
      const hasUnparsedIngredients = ingredients.some(ing => !ing.parsed);

      const recipeData: Partial<Recipe> = {
        ...preview.recipe,
        ingredients,
        hasUnparsedIngredients,
      };

      const savedRecipe = await this.recipeService.createRecipe(recipeData);

      this.urlSuccess.set(`Recipe "${savedRecipe.name}" imported successfully!`);
      this.importUrl = '';

      setTimeout(() => {
        this.router.navigate(['/recipes', savedRecipe.id]);
      }, 1500);
    } catch (e: any) {
      this.urlError.set(e.error?.message || 'Failed to import recipe. Please check the URL and try again.');
    } finally {
      this.importingUrl.set(false);
    }
  }

  // Mealie Import Methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private async handleFile(file: File): Promise<void> {
    if (!file.name.endsWith('.zip')) {
      this.mealieError.set('Please select a ZIP file');
      return;
    }

    this.selectedFile.set(file);
    this.mealieError.set(null);
    this.mealieSuccess.set(null);
    this.parsingMealie.set(true);

    try {
      const { recipes, users } = await this.parseMealieBackup(file);
      this.mealieRecipes.set(recipes.map(r => ({ ...r, selected: true })));
      this.mealieUsers.set(users);
      console.log(`Parsed ${recipes.length} recipes and ${users.length} users from Mealie backup`);
    } catch (e: any) {
      this.mealieError.set('Failed to parse Mealie backup. Please ensure it\'s a valid backup file.');
    } finally {
      this.parsingMealie.set(false);
    }
  }

  private async parseMealieBackup(file: File): Promise<{ recipes: MealieRecipe[]; users: MealieUserImportDto[] }> {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);

    // Debug: Log all files in the ZIP
    const allFiles = Object.keys(zip.files);
    console.log('All files in ZIP:', allFiles);
    console.log('Image files found:', allFiles.filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f)));

    const databaseFile = zip.file('database.json');
    if (!databaseFile) {
      throw new Error('database.json not found in backup');
    }

    const content = await databaseFile.async('string');
    const database = JSON.parse(content);

    // Extract Mealie users
    const users: MealieUserImportDto[] = (database.users || []).map((u: any) => ({
      mealieId: u.id,
      fullName: u.full_name || u.username || 'Unknown User',
      username: u.username,
      email: u.email
    }));
    console.log(`Found ${users.length} Mealie users:`, users);

    // Create a map for quick user lookups by ID
    const userMap = new Map<string, string>();
    for (const u of database.users || []) {
      userMap.set(u.id, u.full_name || u.username || 'Unknown User');
    }

    const recipes: MealieRecipe[] = [];

    for (const r of (database.recipes || [])) {
      // Look up the user who created this recipe
      const originalMealieUserName = r.user_id ? userMap.get(r.user_id) : undefined;

      const recipe: MealieRecipe = {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        prepTime: r.prep_time,
        cookTime: r.cook_time || r.perform_time,
        totalTime: r.total_time,
        servings: r.recipe_servings,
        sourceUrl: r.org_url,
        originalMealieUserId: r.user_id,
        originalMealieUserName,
        ingredients: (() => {
          // Mealie stores section as 'title' on the first ingredient of each section
          // We need to track the current section and apply it to subsequent ingredients
          const rawIngredients = (database.recipes_ingredients || [])
            .filter((i: any) => i.recipe_id === r.id)
            .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
          
          let currentSection: string | undefined;
          return rawIngredients.map((i: any) => {
            // If this ingredient has a title, it starts a new section
            if (i.title) {
              currentSection = i.title;
            }
            return { 
              display: i.original_text || i.display || i.note || '',
              original_text: i.original_text || '',
              section: currentSection
            };
          });
        })(),
        instructions: (database.recipe_instructions || [])
          .filter((i: any) => i.recipe_id === r.id)
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
          .map((i: any) => ({ 
            text: i.text || '', 
            position: i.position || 0,
            title: i.title || undefined  // Capture instruction section title
          })),
        tags: (database.recipes_to_tags || [])
          .filter((rt: any) => rt.recipe_id === r.id)
          .map((rt: any) => {
            const tag = (database.tags || []).find((t: any) => t.id === rt.tag_id);
            return tag?.name;
          })
          .filter(Boolean)
      };

      // Try to find the recipe image in the backup
      // Mealie stores images in: data/recipes/{id}/*.webp
      // Note: recipe IDs in database may not have hyphens, but folder names do
      const idWithHyphens = this.formatUuid(r.id);
      console.log(`Looking for images for recipe: ${r.name} (id: ${r.id}, formatted: ${idWithHyphens}, slug: ${r.slug})`);
      
      const imageFolders = [
        `data/recipes/${idWithHyphens}/images`,
        `data/recipes/${idWithHyphens}`,
        `data/recipes/${r.id}/images`,
        `data/recipes/${r.id}`,
        `recipes/${idWithHyphens}/images`,
        `recipes/${r.id}/images`,
        `recipes/${r.slug}/images`,
        `recipes/${r.slug}`,
      ];

      let imageFound = false;

      // Look for image files in the possible folders
      for (const folder of imageFolders) {
        // Get all files in the folder
        const folderFiles = Object.keys(zip.files).filter(path => 
          path.startsWith(folder + '/') && 
          /\.(webp|jpg|jpeg|png)$/i.test(path)
        );

        console.log(`  Checking folder ${folder}: found ${folderFiles.length} images`, folderFiles);

        if (folderFiles.length > 0) {
          // Prefer original or min-original, otherwise take the first image
          const preferredImage = folderFiles.find(f => 
            f.includes('original') || f.includes('min-original')
          ) || folderFiles[0];

          const imageFile = zip.file(preferredImage);
          if (imageFile) {
            try {
              recipe.imageData = await imageFile.async('blob');
              console.log(`  ✓ Found image for ${r.name}: ${preferredImage} (${recipe.imageData.size} bytes)`);
              imageFound = true;
              break;
            } catch (e) {
              console.warn(`  ✗ Failed to extract image ${preferredImage}:`, e);
            }
          }
        }
      }

      if (!imageFound) {
        console.log(`  ✗ No image found for ${r.name}`);
      }

      recipes.push(recipe);
    }

    return { recipes, users };
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.mealieRecipes.set([]);
    this.mealieUsers.set([]);
  }

  selectAllMealie(): void {
    this.mealieRecipes.update(recipes => recipes.map(r => ({ ...r, selected: true })));
  }

  deselectAllMealie(): void {
    this.mealieRecipes.update(recipes => recipes.map(r => ({ ...r, selected: false })));
  }

  getSelectedCount(): number {
    return this.mealieRecipes().filter(r => r.selected).length;
  }

  async previewMealieImport(): Promise<void> {
    const selected = this.mealieRecipes().filter(r => r.selected);
    if (selected.length === 0) return;

    // Build preview data
    const preview = selected.map(recipe => ({
      recipeName: recipe.name,
      ingredientCount: recipe.ingredients.length,
      ingredients: recipe.ingredients.map(ing => ing.display).filter(Boolean),
    }));

    const totalIngredients = preview.reduce((sum, r) => sum + r.ingredientCount, 0);

    const previewData = {
      totalRecipes: preview.length,
      totalIngredients,
      recipes: preview,
    };

    // Download as JSON file
    const blob = new Blob([JSON.stringify(previewData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mealie-preview-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.snackBar.open(`Downloaded preview with ${totalIngredients} ingredients from ${preview.length} recipes`, 'OK', { duration: 3000 });
  }

  async importSelectedMealie(): Promise<void> {
    const selected = this.mealieRecipes().filter(r => r.selected);
    if (selected.length === 0) return;

    this.importingMealie.set(true);
    this.importProgress.set(0);
    this.importedCount.set(0);
    this.mealieError.set(null);

    try {
      // First, import Mealie users to get the ID mapping
      const users = this.mealieUsers();
      let mealieUserIdMap = new Map<string, string>(); // Map from Mealie user ID to our mealie_users.id

      if (users.length > 0) {
        console.log(`Importing ${users.length} Mealie users...`);
        try {
          const importedUsers = await firstValueFrom(this.mealieUsersService.importUsers(users));
          for (const user of importedUsers) {
            mealieUserIdMap.set(user.mealieId, user.id);
          }
          console.log(`✓ Imported ${importedUsers.length} Mealie users`);

          // Try to auto-link users by email
          const linkResult = await firstValueFrom(this.mealieUsersService.autoLink());
          if (linkResult.linked > 0) {
            console.log(`✓ Auto-linked ${linkResult.linked} Mealie users to app accounts`);
          }
        } catch (userError) {
          console.error('Failed to import Mealie users:', userError);
          // Continue with recipe import even if user import fails
        }
      }

      // Convert recipes to the format expected by the backend
      console.log(`Preparing ${selected.length} recipes for import...`);
      this.importProgress.set(10);

      const recipesToImport: MealieImportRecipe[] = await Promise.all(
        selected.map(async (mealieRecipe) => {
          // Convert image blob to base64 if present
          let imageBase64: string | undefined;
          let imageMimeType: string | undefined;

          if (mealieRecipe.imageData) {
            try {
              imageBase64 = await this.blobToBase64(mealieRecipe.imageData);
              imageMimeType = mealieRecipe.imageData.type || 'image/jpeg';
            } catch (imgErr) {
              console.warn(`Failed to convert image for ${mealieRecipe.name}:`, imgErr);
            }
          }

          // Look up the originalMealieUserId in our new table
          const originalMealieUserId = mealieRecipe.originalMealieUserId
            ? mealieUserIdMap.get(mealieRecipe.originalMealieUserId)
            : undefined;

          return {
            id: mealieRecipe.id,
            name: mealieRecipe.name,
            description: mealieRecipe.description,
            prepTime: mealieRecipe.prepTime,
            cookTime: mealieRecipe.cookTime,
            totalTime: mealieRecipe.totalTime,
            servings: mealieRecipe.servings,
            sourceUrl: mealieRecipe.sourceUrl,
            ingredients: mealieRecipe.ingredients
              .filter(ing => ing.display && ing.display.trim())
              .map(ing => ({ 
                display: ing.display,
                section: ing.section  // Pass section info to backend
              })),
            instructions: mealieRecipe.instructions
              .filter(inst => inst.text && inst.text.trim())
              .map(inst => ({ 
                text: inst.text!,
                title: inst.title  // Pass instruction section title to backend
              })),
            tags: mealieRecipe.tags,
            originalMealieUserId,
            imageBase64,
            imageMimeType,
          };
        })
      );

      console.log(`Sending ${recipesToImport.length} recipes to backend for import with ingredient parsing...`);
      this.importProgress.set(30);

      // Call the backend to import all recipes with ingredient parsing
      const result = await this.recipeService.importFromMealie(recipesToImport) as any;

      this.importedCount.set(result.imported);
      this.importProgress.set(100);

      // Build success message
      let successMsg = `Successfully imported ${result.imported} recipe(s)`;
      if (result.skipped > 0) {
        successMsg += `, ${result.skipped} skipped`;
      }
      if (result.failed > 0) {
        successMsg += `, ${result.failed} failed`;
      }
      
      // Check for recipes skipped due to failed ingredient parsing
      if (result.recipesWithFailedIngredients && result.recipesWithFailedIngredients.length > 0) {
        const totalFailed = result.recipesWithFailedIngredients.reduce(
          (sum: number, r: any) => sum + r.failedIngredients.length, 0
        );
        successMsg += `. ${result.recipesWithFailedIngredients.length} recipes skipped (${totalFailed} unmatched ingredients).`;
        
        // Download the report so user can fix and re-import
        this.downloadFailedIngredientsReport(result.recipesWithFailedIngredients);
      }

      if (result.errors.length > 0) {
        console.warn('Some recipes failed to import:', result.errors);
      }
      
      this.mealieSuccess.set(successMsg);

      this.mealieRecipes.set([]);
      this.selectedFile.set(null);

      this.snackBar.open('Import complete!', 'View Recipes', { duration: 5000 })
        .onAction()
        .subscribe(() => this.router.navigate(['/recipes']));
    } catch (e: any) {
      console.error('Import failed:', e);
      this.mealieError.set(`Import failed: ${e.message || 'Unknown error'}`);
    } finally {
      this.importingMealie.set(false);
    }
  }

  private downloadFailedIngredientsReport(recipesWithFailedIngredients: any[]): void {
    // Collect all unique unmatched ingredient names for easy reference
    const allUnmatchedIngredientNames = new Set<string>();
    recipesWithFailedIngredients.forEach(r => {
      r.failedIngredients.forEach((ing: any) => {
        allUnmatchedIngredientNames.add(ing.parsedIngredient || ing);
      });
    });

    const report = {
      generatedAt: new Date().toISOString(),
      note: 'These recipes were SKIPPED because they had unmatched ingredients. Add the missing ingredients to your known ingredients database, then re-import these recipes.',
      summary: {
        skippedRecipes: recipesWithFailedIngredients.length,
        totalUnmatchedIngredients: recipesWithFailedIngredients.reduce(
          (sum, r) => sum + r.failedIngredients.length, 0
        ),
        uniqueUnmatchedIngredients: Array.from(allUnmatchedIngredientNames).sort(),
      },
      recipes: recipesWithFailedIngredients.map(r => ({
        recipeName: r.recipeName,
        status: 'SKIPPED',
        totalIngredients: r.totalIngredients,
        unmatchedCount: r.failedIngredients.length,
        unmatchedIngredients: r.failedIngredients.map((ing: any) => {
          // Handle both old format (string) and new format (object)
          if (typeof ing === 'string') {
            return { originalText: ing, reason: 'No match' };
          }
          return {
            originalText: ing.originalText,
            parsed: {
              ingredient: ing.parsedIngredient,
              quantity: ing.parsedQuantity,
              unit: ing.parsedUnit,
              unitMatched: ing.unitMatched,
            },
            reason: ing.reason,
          };
        }),
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skipped-recipes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data:*/*;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Convert a UUID without hyphens to standard format with hyphens
  private formatUuid(id: string): string {
    // If already has hyphens, return as-is
    if (id.includes('-')) return id;
    
    // Standard UUID format: 8-4-4-4-12
    if (id.length === 32) {
      return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
    }
    
    return id;
  }

  async deleteAllRecipes(): Promise<void> {
    const confirmed = confirm(
      '⚠️ Are you sure you want to delete ALL your recipes?\n\n' +
      'This action cannot be undone!'
    );

    if (!confirmed) return;

    this.deletingAll.set(true);
    this.deleteError.set(null);
    this.deleteSuccess.set(null);

    try {
      const recipes = await this.recipeService.getMyRecipes();

      for (const recipe of recipes) {
        if (recipe.id) {
          await this.recipeService.deleteRecipe(recipe.id);
        }
      }

      this.deleteSuccess.set(`Successfully deleted ${recipes.length} recipe(s)!`);
      this.snackBar.open(`Deleted ${recipes.length} recipes`, 'OK', { duration: 3000 });
    } catch (e: any) {
      this.deleteError.set(`Failed to delete recipes: ${e.message || 'Unknown error'}`);
    } finally {
      this.deletingAll.set(false);
    }
  }
}
