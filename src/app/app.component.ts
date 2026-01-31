import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    @if (authService.loading()) {
      <div class="loading-screen">
        <div class="loader"></div>
        <p>Loading...</p>
      </div>
    } @else {
      @if (authService.isAuthenticated()) {
        <app-navbar></app-navbar>
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      } @else {
        <router-outlet></router-outlet>
      }
    }
  `,
  styles: [`
    .main-content {
      padding-top: 64px;
      min-height: 100vh;
      background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .loading-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: white;
      gap: 1rem;
    }

    .loader {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(233, 69, 96, 0.3);
      border-top-color: #e94560;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    p {
      font-size: 1.1rem;
      opacity: 0.8;
    }
  `]
})
export class AppComponent {
  authService = inject(AuthService);
}
