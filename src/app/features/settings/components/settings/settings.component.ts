import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Settings</h1>
        <p class="subtitle">Manage your account preferences</p>
      </header>

      <mat-card class="settings-card">
        <mat-card-content>
          <div class="settings-section">
            <div class="section-header">
              <mat-icon class="section-icon">share</mat-icon>
              <h3>Sharing Preferences</h3>
            </div>
            <mat-divider></mat-divider>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-title">Share all recipes with friends</div>
                <div class="setting-description">
                  When enabled, all your recipes will automatically be visible to your friends.
                  When disabled, you can choose which recipes to share individually.
                </div>
              </div>
              <div class="setting-control">
                @if (saving()) {
                  <mat-spinner diameter="24"></mat-spinner>
                } @else {
                  <mat-slide-toggle
                    [checked]="shareAllRecipes()"
                    (change)="onShareAllToggle($event.checked)"
                    color="primary">
                  </mat-slide-toggle>
                }
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="info-card">
        <mat-card-content>
          <div class="info-content">
            <mat-icon class="info-icon">info</mat-icon>
            <div class="info-text">
              <strong>How sharing works:</strong>
              <ul>
                <li>When "Share all recipes" is <strong>ON</strong>: All your recipes are visible to your friends automatically.</li>
                <li>When "Share all recipes" is <strong>OFF</strong>: Only recipes you've marked as "shared" will be visible to friends.</li>
              </ul>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 800px;
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

    .settings-card {
      margin-bottom: 1.5rem;
      border-radius: 12px;
      overflow: hidden;
    }

    .settings-section {
      .section-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;

        .section-icon {
          color: #e94560;
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        h3 {
          margin: 0;
          color: #1a1a2e;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.25rem;
        }
      }

      mat-divider {
        margin-bottom: 1.5rem;
      }
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 2rem;
      padding: 1rem 0;
    }

    .setting-info {
      flex: 1;

      .setting-title {
        font-weight: 500;
        color: #1a1a2e;
        font-size: 1rem;
        margin-bottom: 0.5rem;
      }

      .setting-description {
        color: #666;
        font-size: 0.875rem;
        line-height: 1.5;
      }
    }

    .setting-control {
      display: flex;
      align-items: center;
      min-width: 60px;
      justify-content: flex-end;
    }

    ::ng-deep .setting-control .mat-mdc-slide-toggle .mdc-switch--selected .mdc-switch__handle::after {
      background: #e94560 !important;
    }

    ::ng-deep .setting-control .mat-mdc-slide-toggle .mdc-switch--selected .mdc-switch__track::before {
      background: rgba(233, 69, 96, 0.3) !important;
    }

    .info-card {
      border-radius: 12px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-left: 4px solid #e94560;
    }

    .info-content {
      display: flex;
      gap: 1rem;
      align-items: flex-start;

      .info-icon {
        color: #e94560;
        font-size: 24px;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .info-text {
        flex: 1;

        strong {
          color: #1a1a2e;
          display: block;
          margin-bottom: 0.5rem;
        }

        ul {
          margin: 0;
          padding-left: 1.25rem;
          color: #555;
          font-size: 0.875rem;
          line-height: 1.6;

          li {
            margin-bottom: 0.25rem;

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }
    }

    @media (max-width: 600px) {
      .page-container {
        padding: 1rem;
      }

      .page-header {
        margin-bottom: 1.5rem;

        h1 {
          font-size: 2rem;
        }
      }

      .setting-item {
        flex-direction: column;
        gap: 1rem;
      }

      .setting-control {
        align-self: flex-start;
      }

      .info-content {
        flex-direction: column;
        gap: 0.75rem;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  shareAllRecipes = signal(true);
  saving = signal(false);

  ngOnInit(): void {
    // Initialize from user profile
    const user = this.authService.appUser();
    if (user) {
      // Default to true if not set
      this.shareAllRecipes.set(user.shareAllRecipesWithFriends ?? true);
    }
  }

  async onShareAllToggle(checked: boolean): Promise<void> {
    this.saving.set(true);

    try {
      await this.http.put(`${environment.apiUrl}/users/settings`, {
        shareAllRecipesWithFriends: checked
      }).toPromise();

      this.shareAllRecipes.set(checked);

      // Refresh the user profile to update the cached value
      await this.authService.refreshProfile();

      this.snackBar.open(
        checked 
          ? 'All recipes will now be shared with friends' 
          : 'Recipe sharing is now selective',
        'Dismiss',
        { duration: 3000 }
      );
    } catch (e) {
      console.error('Failed to update settings:', e);
      this.snackBar.open('Failed to update settings', 'Dismiss', { duration: 3000 });
      // Revert the toggle
      this.shareAllRecipes.set(!checked);
    } finally {
      this.saving.set(false);
    }
  }
}

