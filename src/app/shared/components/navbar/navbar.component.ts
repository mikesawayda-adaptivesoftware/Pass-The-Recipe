import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatSidenavModule,
    MatListModule
  ],
  template: `
    <mat-toolbar class="navbar">
      <div class="navbar-content">
        <!-- Hamburger menu button (mobile only) -->
        <button mat-icon-button class="mobile-menu-button" (click)="toggleMobileMenu()">
          <mat-icon>{{ mobileMenuOpen() ? 'close' : 'menu' }}</mat-icon>
        </button>

        <a routerLink="/recipes" class="logo">
          <mat-icon class="logo-icon">restaurant_menu</mat-icon>
          <span class="logo-text">Pass The Recipe</span>
        </a>

        <!-- Desktop navigation -->
        <nav class="nav-links desktop-nav">
          <a mat-button routerLink="/recipes" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            <mat-icon>menu_book</mat-icon>
            <span>My Recipes</span>
          </a>
          <a mat-button routerLink="/favorites" routerLinkActive="active">
            <mat-icon>favorite</mat-icon>
            <span>Favorites</span>
          </a>
          <a mat-button routerLink="/shared" routerLinkActive="active">
            <mat-icon>people</mat-icon>
            <span>Shared With Me</span>
          </a>
          <a mat-button routerLink="/friends" routerLinkActive="active">
            <mat-icon>group</mat-icon>
            <span>Friends</span>
          </a>
          <a mat-button routerLink="/import" routerLinkActive="active">
            <mat-icon>cloud_download</mat-icon>
            <span>Import</span>
          </a>
          <a mat-button routerLink="/unparsed" routerLinkActive="active">
            <mat-icon>warning</mat-icon>
            <span>Unparsed</span>
          </a>
          <a mat-button routerLink="/shopping" routerLinkActive="active">
            <mat-icon>shopping_cart</mat-icon>
            <span>Shopping</span>
          </a>
        </nav>

        <div class="user-section">
          <button mat-icon-button class="user-button" (click)="toggleProfileDrawer()">
            @if (authService.appUser()?.photoURL) {
              <img [src]="authService.appUser()?.photoURL" alt="Profile" class="user-avatar">
            } @else {
              <mat-icon>account_circle</mat-icon>
            }
          </button>
        </div>
      </div>
    </mat-toolbar>

    <!-- Mobile slide-out menu -->
    <div class="mobile-menu-overlay" [class.open]="mobileMenuOpen()" (click)="closeMobileMenu()"></div>
    <nav class="mobile-menu" [class.open]="mobileMenuOpen()">
      <div class="mobile-menu-header">
        <div class="mobile-menu-brand">
          <mat-icon class="logo-icon">restaurant_menu</mat-icon>
          <span>Pass The Recipe</span>
        </div>
        <button mat-icon-button class="mobile-menu-close" (click)="closeMobileMenu()" aria-label="Close menu">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <mat-divider></mat-divider>
      <mat-nav-list>
        <a mat-list-item routerLink="/recipes" routerLinkActive="active" 
           [routerLinkActiveOptions]="{exact: true}" (click)="closeMobileMenu()">
          <mat-icon matListItemIcon>menu_book</mat-icon>
          <span matListItemTitle>My Recipes</span>
        </a>
        <a mat-list-item routerLink="/favorites" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon matListItemIcon>favorite</mat-icon>
          <span matListItemTitle>Favorites</span>
        </a>
        <a mat-list-item routerLink="/shared" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon matListItemIcon>people</mat-icon>
          <span matListItemTitle>Shared With Me</span>
        </a>
        <a mat-list-item routerLink="/friends" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon matListItemIcon>group</mat-icon>
          <span matListItemTitle>Friends</span>
        </a>
        <a mat-list-item routerLink="/import" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon matListItemIcon>cloud_download</mat-icon>
          <span matListItemTitle>Import</span>
        </a>
        <a mat-list-item routerLink="/unparsed" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon matListItemIcon>warning</mat-icon>
          <span matListItemTitle>Unparsed Ingredients</span>
        </a>
        <a mat-list-item routerLink="/shopping" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon matListItemIcon>shopping_cart</mat-icon>
          <span matListItemTitle>Shopping</span>
        </a>
      </mat-nav-list>
      <mat-divider></mat-divider>
      <div class="mobile-menu-footer">
        <div class="mobile-user-info">
          @if (authService.appUser()?.photoURL) {
            <img [src]="authService.appUser()?.photoURL" alt="Profile" class="mobile-user-avatar">
          } @else {
            <mat-icon class="mobile-user-icon">account_circle</mat-icon>
          }
          <div class="mobile-user-details">
              <strong>{{ authService.appUser()?.displayName }}</strong>
              <small>{{ authService.appUser()?.email }}</small>
            </div>
        </div>
        <button mat-stroked-button color="warn" (click)="logout(); closeMobileMenu()">
              <mat-icon>logout</mat-icon>
          Sign Out
        </button>
      </div>
    </nav>

    <!-- Profile slide-out drawer (right side) -->
    <div class="profile-drawer-overlay" [class.open]="profileDrawerOpen()" (click)="closeProfileDrawer()"></div>
    <aside class="profile-drawer" [class.open]="profileDrawerOpen()">
      <div class="profile-drawer-header">
        <span class="profile-drawer-title">Account</span>
        <button mat-icon-button class="profile-drawer-close" (click)="closeProfileDrawer()" aria-label="Close profile">
          <mat-icon>close</mat-icon>
            </button>
      </div>
      <div class="profile-drawer-user">
        <div class="profile-avatar-large">
          @if (authService.appUser()?.photoURL) {
            <img [src]="authService.appUser()?.photoURL" alt="Profile">
          } @else {
            <mat-icon>person</mat-icon>
          }
        </div>
        <div class="profile-user-info">
          <span class="profile-name">{{ authService.appUser()?.displayName || 'User' }}</span>
          <span class="profile-email">{{ authService.appUser()?.email }}</span>
        </div>
      </div>
      <mat-divider></mat-divider>
      <mat-nav-list class="profile-drawer-nav">
        <a mat-list-item (click)="closeProfileDrawer()">
          <mat-icon matListItemIcon>person</mat-icon>
          <span matListItemTitle>My Profile</span>
        </a>
        <a mat-list-item routerLink="/settings" (click)="closeProfileDrawer()">
          <mat-icon matListItemIcon>settings</mat-icon>
          <span matListItemTitle>Settings</span>
        </a>
        <a mat-list-item (click)="closeProfileDrawer()">
          <mat-icon matListItemIcon>help_outline</mat-icon>
          <span matListItemTitle>Help & Support</span>
        </a>
      </mat-nav-list>
      <mat-divider></mat-divider>
      <div class="profile-drawer-footer">
        <button mat-stroked-button color="warn" (click)="logout(); closeProfileDrawer()">
          <mat-icon>logout</mat-icon>
          Sign Out
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .navbar {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      height: 64px;
      padding: 0;
    }

    .navbar-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 1.5rem;
      height: 100%;
    }

    .mobile-menu-button {
      display: none;
      color: white;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: white;
    }

    .logo-icon {
      color: #e94560;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .logo-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: #e94560;
    }

    .nav-links {
      display: flex;
      gap: 0.5rem;

      a {
        color: rgba(255, 255, 255, 0.8);
        transition: all 0.2s ease;

        mat-icon {
          margin-right: 4px;
        }

        &:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }

        &.active {
          color: #e94560;
          background: rgba(233, 69, 96, 0.1);
        }
      }
    }

    .user-section {
      display: flex;
      align-items: center;
    }

    .user-button {
      color: white;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    /* Mobile menu styles */
    .mobile-menu-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;

      &.open {
        opacity: 1;
        visibility: visible;
      }
    }

    .mobile-menu {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      max-width: 85vw;
      background: white;
      z-index: 1001;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto;
      box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);

      &.open {
        transform: translateX(0);
      }
    }

    .mobile-menu-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.5rem 0 1rem;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      height: 64px;
      box-sizing: border-box;
    }

    .mobile-menu-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .logo-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      span {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.25rem;
        font-weight: 700;
        color: #e94560;
      }
    }

    .mobile-menu-close {
      color: rgba(255, 255, 255, 0.8);
      transition: color 0.2s ease, background 0.2s ease;

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .mobile-menu mat-nav-list {
      padding-top: 0.5rem;

      a {
        color: #333;
        border-radius: 0;
        margin: 0;

        &.active {
          background: rgba(233, 69, 96, 0.1);
          color: #e94560;

          mat-icon {
            color: #e94560;
          }
        }

        mat-icon {
          color: #666;
        }

        &:hover {
          background: rgba(0, 0, 0, 0.04);
        }
      }
    }

    .mobile-menu-footer {
      padding: 1rem;
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      button {
        width: 100%;
      }
    }

    .mobile-user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .mobile-user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .mobile-user-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #666;
    }

    .mobile-user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;

      strong {
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      small {
        color: #666;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    /* Profile drawer styles (right side) */
    .profile-drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1099;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;

      &.open {
        opacity: 1;
        visibility: visible;
      }
    }

    .profile-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 320px;
      max-width: 90vw;
      background: white;
      z-index: 1100;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;

      &.open {
        transform: translateX(0);
      }
    }

    .profile-drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.5rem 0 1.25rem;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      height: 64px;
      flex-shrink: 0;
    }

    .profile-drawer-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.25rem;
      font-weight: 600;
      color: #e94560;
    }

    .profile-drawer-close {
      color: rgba(255, 255, 255, 0.8);
      transition: color 0.2s ease, background 0.2s ease;

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .profile-drawer-user {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1.5rem;
      background: linear-gradient(180deg, #f8f9fa 0%, white 100%);
      text-align: center;
    }

    .profile-avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      border: 3px solid #e94560;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #e94560;
      }
    }

    .profile-user-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .profile-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1a1a2e;
    }

    .profile-email {
      font-size: 0.875rem;
      color: #666;
    }

    .profile-drawer-nav {
      padding: 0.5rem 0;
      flex: 1;

      a {
        color: #333;

        mat-icon {
          color: #666;
        }

        &:hover {
          background: rgba(233, 69, 96, 0.08);

          mat-icon {
            color: #e94560;
          }
        }
      }
    }

    .profile-drawer-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid #eee;

      button {
        width: 100%;
      }
    }

    /* Tablet breakpoint - hide text, keep icons */
    @media (max-width: 900px) {
      .nav-links.desktop-nav a span {
        display: none;
      }

      .logo-text {
        display: none;
      }
    }

    /* Mobile breakpoint - show hamburger menu */
    @media (max-width: 600px) {
      .mobile-menu-button {
        display: flex;
        order: -1;
        margin-right: 0.5rem;
      }

      .desktop-nav {
        display: none;
      }

      .mobile-menu-overlay,
      .mobile-menu {
        display: block;
      }

      .navbar-content {
        padding: 0 0.75rem;
      }

      .logo {
        flex: 1;
        justify-content: center;
      }

      .logo-text {
        display: block;
        font-size: 1.2rem;
      }
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);
  mobileMenuOpen = signal(false);
  profileDrawerOpen = signal(false);

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleProfileDrawer(): void {
    this.profileDrawerOpen.update(open => !open);
  }

  closeProfileDrawer(): void {
    this.profileDrawerOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}

