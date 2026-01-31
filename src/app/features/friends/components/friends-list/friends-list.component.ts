import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FriendService } from '../../../../core/services/friend.service';
import { AppUser, FriendRequest } from '../../../../core/models';

@Component({
  selector: 'app-friends-list',
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
    MatTabsModule,
    MatListModule,
    MatBadgeModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Friends</h1>
        <p class="subtitle">Connect with friends to share recipes</p>
      </header>

      <mat-card class="add-friend-card">
        <mat-card-content>
          <h3>Add a Friend</h3>
          <div class="search-form">
            <mat-form-field appearance="outline" class="email-field">
              <mat-label>Friend's Email</mat-label>
              <input matInput [(ngModel)]="searchEmail" placeholder="friend@email.com" type="email">
              <mat-icon matPrefix>email</mat-icon>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="searchAndAdd()" [disabled]="searching() || !searchEmail">
              @if (searching()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <ng-container>
                  <mat-icon>person_add</mat-icon>
                  Send Request
                </ng-container>
              }
            </button>
          </div>
          @if (searchError()) {
            <p class="error-message">{{ searchError() }}</p>
          }
          @if (searchSuccess()) {
            <p class="success-message">{{ searchSuccess() }}</p>
          }
        </mat-card-content>
      </mat-card>

      <mat-tab-group class="friends-tabs" mat-stretch-tabs="true">
        <mat-tab>
          <ng-template mat-tab-label>
            <div class="tab-label">
            <mat-icon>people</mat-icon>
              <span class="tab-text">Friends</span>
              <span class="tab-count">({{ friends().length }})</span>
            </div>
          </ng-template>

          <div class="tab-content">
            @if (loading()) {
              <div class="loading">
                <mat-spinner diameter="32"></mat-spinner>
              </div>
            } @else if (friends().length === 0) {
              <div class="empty-state">
                <mat-icon>people_outline</mat-icon>
                <p>No friends yet. Send a friend request to get started!</p>
              </div>
            } @else {
              <mat-list>
                @for (friend of friends(); track friend.id) {
                  <mat-list-item class="friend-item">
                    <div class="friend-avatar" matListItemAvatar>
                      @if (friend.photoURL) {
                        <img [src]="friend.photoURL" alt="Avatar">
                      } @else {
                        <mat-icon>account_circle</mat-icon>
                      }
                    </div>
                    <div matListItemTitle>{{ friend.displayName }}</div>
                    <div matListItemLine>{{ friend.email }}</div>
                    <button mat-icon-button color="warn" (click)="removeFriend(friend)" matListItemMeta>
                      <mat-icon>person_remove</mat-icon>
                    </button>
                  </mat-list-item>
                  <mat-divider></mat-divider>
                }
              </mat-list>
            }
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <div class="tab-label">
              <span class="icon-with-badge">
                <mat-icon>notifications</mat-icon>
                @if (pendingRequests().length > 0) {
                  <span class="request-badge">{{ pendingRequests().length }}</span>
                }
              </span>
              <span class="tab-text">Requests</span>
            </div>
          </ng-template>

          <div class="tab-content">
            @if (pendingRequests().length === 0) {
              <div class="empty-state">
                <mat-icon>mail_outline</mat-icon>
                <p>No pending friend requests</p>
              </div>
            } @else {
              <mat-list>
                @for (request of pendingRequests(); track request.id) {
                  <mat-list-item class="request-item">
                    <mat-icon matListItemAvatar>account_circle</mat-icon>
                    <div matListItemTitle>{{ request.fromUserName }}</div>
                    <div matListItemLine>{{ request.fromUserEmail }}</div>
                    <div class="request-actions" matListItemMeta>
                      <button mat-icon-button color="primary" (click)="acceptRequest(request)">
                        <mat-icon>check</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="rejectRequest(request)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </mat-list-item>
                  <mat-divider></mat-divider>
                }
              </mat-list>
            }
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <div class="tab-label">
            <mat-icon>send</mat-icon>
              <span class="tab-text">Sent</span>
            </div>
          </ng-template>

          <div class="tab-content">
            @if (sentRequests().length === 0) {
              <div class="empty-state">
                <mat-icon>send</mat-icon>
                <p>No pending sent requests</p>
              </div>
            } @else {
              <mat-list>
                @for (request of sentRequests(); track request.id) {
                  <mat-list-item class="request-item">
                    <mat-icon matListItemAvatar>hourglass_empty</mat-icon>
                    <div matListItemTitle>Pending</div>
                    <div matListItemLine>Sent to {{ request.toUserId }}</div>
                  </mat-list-item>
                  <mat-divider></mat-divider>
                }
              </mat-list>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
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

    .add-friend-card {
      margin-bottom: 2rem;
      border-radius: 12px;
      overflow: hidden;

      h3 {
        margin: 0 0 1rem 0;
        color: #1a1a2e;
        font-family: 'Playfair Display', Georgia, serif;
      }
    }

    ::ng-deep .add-friend-card .mat-mdc-card-content {
      overflow: hidden;
    }

    .search-form {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      width: 100%;
      min-width: 0;

      .email-field {
        flex: 1 1 auto;
        min-width: 0;
        width: 100%;
      }

      button {
        height: 56px;
        flex-shrink: 0;
        background: linear-gradient(135deg, #e94560 0%, #c73e54 100%);
        white-space: nowrap;
      }
    }

    ::ng-deep .search-form .mat-mdc-form-field {
      width: 100%;
    }

    ::ng-deep .search-form .mat-mdc-text-field-wrapper {
      width: 100%;
    }

    .error-message {
      color: #c62828;
      margin: 0.5rem 0 0 0;
      font-size: 0.875rem;
    }

    .success-message {
      color: #2e7d32;
      margin: 0.5rem 0 0 0;
      font-size: 0.875rem;
    }

    .tab-content {
      padding: 1rem 0;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      color: #666;
      text-align: center;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #ccc;
        margin-bottom: 1rem;
      }

      p {
        margin: 0;
      }
    }

    .friend-item, .request-item {
      .friend-avatar {
        img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
          color: #ccc;
        }
      }
    }

    .request-actions {
      display: flex;
      gap: 0.25rem;
    }

    /* Tab group styles */
    .friends-tabs {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: visible;
    }

    ::ng-deep .friends-tabs .mat-mdc-tab-body-wrapper {
      overflow: hidden;
      border-radius: 0 0 12px 12px;
    }

    .tab-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 4px 0;
    }

    .icon-with-badge {
      position: relative;
      display: inline-flex;

      .request-badge {
        position: absolute;
        top: -4px;
        right: -8px;
        background: #f44336;
        color: white;
        font-size: 10px;
        font-weight: 600;
        min-width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
        border-radius: 8px;
        padding: 0 4px;
      }
    }

    ::ng-deep .tab-label .mat-badge-small .mat-badge-content {
      top: -2px !important;
      right: -2px !important;
      font-size: 8px !important;
      width: 14px !important;
      height: 14px !important;
      line-height: 14px !important;
      font-weight: 600 !important;
    }

    ::ng-deep .tab-label .mat-badge .mat-badge-content {
      top: -2px !important;
      right: -2px !important;
      font-size: 8px !important;
      width: 14px !important;
      height: 14px !important;
      line-height: 14px !important;
      font-weight: 600 !important;
    }

    .tab-count {
      font-size: 0.85em;
      opacity: 0.7;
    }

    ::ng-deep .friends-tabs {
      .mat-mdc-tab-header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 12px 12px 0 0;
    }

      .mat-mdc-tab-labels {
        background: transparent;
      }

      .mat-mdc-tab {
        color: rgba(255, 255, 255, 0.7);
        min-width: 0;
        padding: 0 16px;
        
        &.mdc-tab--active {
          color: white;
        }

        .mdc-tab__text-label {
          color: inherit;
        }

        .mdc-tab-indicator__content--underline {
          border-color: #e94560;
          border-width: 3px;
        }
      }

      .mat-mdc-tab:not(.mat-mdc-tab-disabled):hover {
        color: white;
      }

      .mat-mdc-tab:not(.mat-mdc-tab-disabled):focus {
        color: white;
      }

      .mat-badge-content {
        font-size: 8px !important;
        width: 14px !important;
        height: 14px !important;
        line-height: 14px !important;
        top: -2px !important;
        right: -2px !important;
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

      .add-friend-card {
        margin-bottom: 1.5rem;

        h3 {
          font-size: 1.1rem;
          margin-bottom: 0.75rem;
        }
      }

      .search-form {
        flex-direction: column;
        gap: 0.75rem;

        .email-field {
          width: 100%;
        }

        button {
          width: 100%;
          height: 48px;
        }
      }

      .tab-label {
        flex-direction: column;
        gap: 4px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .icon-with-badge .request-badge {
        top: -2px;
        right: -6px;
        font-size: 9px;
        min-width: 14px;
        height: 14px;
        line-height: 14px;
        padding: 0 3px;
      }

      .tab-text {
        font-size: 0.7rem;
      }

      .tab-count {
        display: none;
      }

      ::ng-deep .friends-tabs {
        .mat-mdc-tab {
          padding: 0 8px;
          min-width: 0;
          flex: 1;
        }

        .mat-badge-content {
          font-size: 7px !important;
          width: 12px !important;
          height: 12px !important;
          line-height: 12px !important;
          top: 6px !important;
          right: -2px !important;
        }
      }

      .mat-mdc-tab-header {
        padding-top: 4px;
      }

      .mat-mdc-tab-label-container {
        overflow: visible !important;
      }

      .empty-state {
        padding: 2rem 1rem;

        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
        }
      }
    }

    @media (max-width: 400px) {
      .page-container {
        padding: 0.75rem;
      }

      .search-form button {
        font-size: 0.9rem;
        padding: 0 12px;
      }
    }

    @media (max-width: 360px) {
      .tab-text {
        font-size: 0.7rem;
      }
    }
  `]
})
export class FriendsListComponent implements OnInit {
  private friendService = inject(FriendService);
  private snackBar = inject(MatSnackBar);

  friends = signal<AppUser[]>([]);
  pendingRequests = signal<FriendRequest[]>([]);
  sentRequests = signal<FriendRequest[]>([]);
  loading = signal(true);
  searching = signal(false);
  searchEmail = '';
  searchError = signal<string | null>(null);
  searchSuccess = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [friends, pending, sent] = await Promise.all([
        this.friendService.getFriends(),
        this.friendService.getPendingRequests(),
        this.friendService.getSentRequests()
      ]);
      this.friends.set(friends);
      this.pendingRequests.set(pending);
      this.sentRequests.set(sent);
    } catch (e) {
      console.error('Failed to load friends data:', e);
      this.snackBar.open('Failed to load friends', 'Dismiss', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  async searchAndAdd(): Promise<void> {
    if (!this.searchEmail.trim()) return;

    this.searching.set(true);
    this.searchError.set(null);
    this.searchSuccess.set(null);

    try {
      const user = await this.friendService.searchUserByEmail(this.searchEmail.trim().toLowerCase());

      if (!user) {
        this.searchError.set('No user found with that email address');
        return;
      }

      await this.friendService.sendFriendRequest(user.id);
      this.searchSuccess.set(`Friend request sent to ${user.displayName}!`);
      this.searchEmail = '';

      // Reload sent requests
      const sent = await this.friendService.getSentRequests();
      this.sentRequests.set(sent);
    } catch (e: any) {
      this.searchError.set(e.message || 'Failed to send friend request');
    } finally {
      this.searching.set(false);
    }
  }

  async acceptRequest(request: FriendRequest): Promise<void> {
    try {
      await this.friendService.acceptFriendRequest(request.id!);
      this.snackBar.open('Friend request accepted!', 'Dismiss', { duration: 3000 });
      await this.loadData();
    } catch (e) {
      console.error('Failed to accept request:', e);
      this.snackBar.open('Failed to accept request', 'Dismiss', { duration: 3000 });
    }
  }

  async rejectRequest(request: FriendRequest): Promise<void> {
    try {
      await this.friendService.rejectFriendRequest(request.id!);
      this.pendingRequests.update(requests => requests.filter(r => r.id !== request.id));
      this.snackBar.open('Friend request rejected', 'Dismiss', { duration: 3000 });
    } catch (e) {
      console.error('Failed to reject request:', e);
      this.snackBar.open('Failed to reject request', 'Dismiss', { duration: 3000 });
    }
  }

  async removeFriend(friend: AppUser): Promise<void> {
    if (!confirm(`Are you sure you want to remove ${friend.displayName} from your friends?`)) return;

    try {
      await this.friendService.removeFriend(friend.id);
      this.friends.update(friends => friends.filter(f => f.id !== friend.id));
      this.snackBar.open('Friend removed', 'Dismiss', { duration: 3000 });
    } catch (e) {
      console.error('Failed to remove friend:', e);
      this.snackBar.open('Failed to remove friend', 'Dismiss', { duration: 3000 });
    }
  }
}

