import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AppUser, AuthResponse } from '../models';

const TOKEN_KEY = 'accessToken';
const REMEMBER_ME_KEY = 'rememberMe';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private currentUserSignal = signal<AppUser | null>(null);
  private loadingSignal = signal<boolean>(true);

  readonly appUser = this.currentUserSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  constructor() {
    this.initializeAuth();
  }

  /**
   * Gets the access token from either localStorage or sessionStorage
   */
  getToken(): string | null {
    // Check localStorage first (remember me), then sessionStorage
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  }

  private async initializeAuth(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        const user = await this.http.get<AppUser>(`${environment.apiUrl}/auth/profile`).toPromise();
        this.currentUserSignal.set(user || null);
      } catch {
        this.clearTokens();
        this.currentUserSignal.set(null);
      }
    }
    this.loadingSignal.set(false);
  }

  private clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  private storeToken(token: string, rememberMe: boolean): void {
    // Clear both storages first
    this.clearTokens();
    
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }

  async register(email: string, password: string, displayName: string): Promise<void> {
    const response = await this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, {
      email,
      password,
      displayName
    }).toPromise();

    if (response) {
      // Default to remember me for registration
      this.storeToken(response.accessToken, true);
      this.currentUserSignal.set(response.user);
      this.router.navigate(['/recipes']);
    }
  }

  async login(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    const response = await this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
      email,
      password
    }).toPromise();

    if (response) {
      this.storeToken(response.accessToken, rememberMe);
      this.currentUserSignal.set(response.user);
      this.router.navigate(['/recipes']);
    }
  }

  async logout(): Promise<void> {
    this.clearTokens();
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  async refreshProfile(): Promise<void> {
    try {
      const user = await this.http.get<AppUser>(`${environment.apiUrl}/auth/profile`).toPromise();
      this.currentUserSignal.set(user || null);
    } catch {
      // Ignore errors
    }
  }
}
