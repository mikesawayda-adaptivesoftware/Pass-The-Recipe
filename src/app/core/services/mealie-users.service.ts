import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MealieUser {
  id: string;
  mealieId: string;
  fullName: string;
  username?: string;
  email?: string;
  linkedUserId?: string;
  linkedUser?: {
    id: string;
    email: string;
    displayName: string;
  };
  importedAt: string;
}

export interface MealieUserImportDto {
  mealieId: string;
  fullName: string;
  username?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MealieUsersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/mealie-users`;

  /**
   * Get all imported Mealie users
   */
  getAll(): Observable<MealieUser[]> {
    return this.http.get<MealieUser[]>(this.apiUrl);
  }

  /**
   * Get a single Mealie user by ID
   */
  getOne(id: string): Observable<MealieUser> {
    return this.http.get<MealieUser>(`${this.apiUrl}/${id}`);
  }

  /**
   * Import Mealie users (bulk upsert)
   */
  importUsers(users: MealieUserImportDto[]): Observable<MealieUser[]> {
    return this.http.post<MealieUser[]>(`${this.apiUrl}/import`, users);
  }

  /**
   * Link a Mealie user to an app account
   */
  linkToUser(mealieUserId: string, userId: string): Observable<MealieUser> {
    return this.http.post<MealieUser>(`${this.apiUrl}/${mealieUserId}/link`, {
      userId,
    });
  }

  /**
   * Unlink a Mealie user from an app account
   */
  unlinkUser(mealieUserId: string): Observable<MealieUser> {
    return this.http.post<MealieUser>(`${this.apiUrl}/${mealieUserId}/unlink`, {});
  }

  /**
   * Auto-link all Mealie users to app accounts by email
   */
  autoLink(): Observable<{ linked: number; details: string[] }> {
    return this.http.post<{ linked: number; details: string[] }>(
      `${this.apiUrl}/auto-link`,
      {}
    );
  }
}

