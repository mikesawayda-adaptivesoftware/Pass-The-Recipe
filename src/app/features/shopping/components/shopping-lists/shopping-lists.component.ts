import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { ShoppingListService, ShoppingList } from '../../../../core/services/shopping-list.service';
import { CreateListDialogComponent } from '../create-list-dialog/create-list-dialog.component';

@Component({
  selector: 'app-shopping-lists',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h1>Shopping Lists</h1>
          <p class="subtitle">Plan your grocery shopping</p>
        </div>
        <button mat-raised-button color="primary" class="create-btn" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          New List
        </button>
      </header>

      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Loading shopping lists...</p>
        </div>
      } @else if (lists().length === 0) {
        <div class="empty-state">
          <mat-icon>shopping_cart</mat-icon>
          <h2>No shopping lists yet</h2>
          <p>Create a shopping list by selecting recipes you want to shop for.</p>
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Create Your First List
          </button>
        </div>
      } @else {
        <div class="lists-grid">
          @for (list of lists(); track list.id) {
            <mat-card class="list-card" [routerLink]="['/shopping', list.id]">
              <mat-card-header>
                <mat-card-title>
                  @if (list.isComplete) {
                    <mat-icon class="complete-icon">check_circle</mat-icon>
                  }
                  {{ list.name }}
                </mat-card-title>
                <mat-card-subtitle>
                  {{ list.items.length }} items · {{ list.recipes.length }} recipes
                </mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="progress-info">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="getProgress(list)"></div>
                  </div>
                  <span class="progress-text">
                    {{ getCheckedCount(list) }}/{{ list.items.length }} items
                  </span>
                </div>

                @if (list.recipes.length > 0) {
                  <div class="recipe-chips">
                    @for (recipe of list.recipes.slice(0, 3); track recipe.id) {
                      <span class="recipe-chip">{{ recipe.name }}</span>
                    }
                    @if (list.recipes.length > 3) {
                      <span class="recipe-chip more">+{{ list.recipes.length - 3 }}</span>
                    }
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
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }

    .header-content h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.5rem;
      color: #1a1a2e;
      margin: 0 0 0.5rem 0;
    }

    .subtitle {
      color: #666;
      margin: 0;
    }

    .create-btn {
      background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
      display: flex;
      align-items: center;
      gap: 0.5rem;
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
        color: #ccc;
        margin-bottom: 1rem;
      }

      h2 {
        margin: 0 0 0.5rem 0;
        color: #333;
      }

      p {
        margin: 0 0 1.5rem 0;
      }

      button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .lists-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .list-card {
      cursor: pointer;
      transition: box-shadow 0.2s ease;
      border-radius: 12px;

      &:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      mat-card-header {
        padding-bottom: 8px;
      }

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.4rem !important;
        font-weight: 600 !important;
        color: #1a1a2e !important;
        font-family: 'Playfair Display', Georgia, serif !important;
        margin-bottom: 4px;
      }

      mat-card-subtitle {
        color: #666 !important;
        font-size: 0.9rem !important;
      }

      .complete-icon {
        color: #4caf50;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .progress-info {
      margin-bottom: 1rem;
    }

    .progress-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(135deg, #4caf50 0%, #43a047 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 0.85rem;
      color: #666;
    }

    .recipe-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .recipe-chip {
      background: #f0f0f0;
      color: #666;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;

      &.more {
        background: #e94560;
        color: white;
      }
    }

    @media (max-width: 600px) {
      .page-header {
        flex-direction: column;
        gap: 1rem;
      }

      .lists-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class ShoppingListsComponent implements OnInit {
  private shoppingListService = inject(ShoppingListService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  lists = signal<ShoppingList[]>([]);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadLists();
  }

  async loadLists(): Promise<void> {
    this.loading.set(true);
    try {
      const lists = await this.shoppingListService.getAll().toPromise();
      this.lists.set(lists || []);
    } catch (e) {
      console.error('Failed to load shopping lists:', e);
      this.snackBar.open('Failed to load shopping lists', 'Dismiss', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  getProgress(list: ShoppingList): number {
    if (list.items.length === 0) return 0;
    const checked = list.items.filter(i => i.isChecked).length;
    return (checked / list.items.length) * 100;
  }

  getCheckedCount(list: ShoppingList): number {
    return list.items.filter(i => i.isChecked).length;
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateListDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadLists();
      }
    });
  }
}

