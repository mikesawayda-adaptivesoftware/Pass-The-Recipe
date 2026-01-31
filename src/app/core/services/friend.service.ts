import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AppUser, FriendRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class FriendService {
  private http = inject(HttpClient);

  async searchUserByEmail(email: string): Promise<AppUser | null> {
    try {
      const user = await this.http.get<AppUser | null>(
        `${environment.apiUrl}/users/search`,
        { params: { email } }
      ).toPromise();
      return user || null;
    } catch {
      return null;
    }
  }

  async sendFriendRequest(toUserId: string): Promise<void> {
    await this.http.post(`${environment.apiUrl}/friends/requests`, { toUserId }).toPromise();
  }

  async getPendingRequests(): Promise<FriendRequest[]> {
    const requests = await this.http.get<FriendRequest[]>(
      `${environment.apiUrl}/friends/requests/pending`
    ).toPromise();
    return requests || [];
  }

  async getSentRequests(): Promise<FriendRequest[]> {
    const requests = await this.http.get<FriendRequest[]>(
      `${environment.apiUrl}/friends/requests/sent`
    ).toPromise();
    return requests || [];
  }

  async acceptFriendRequest(requestId: string): Promise<void> {
    await this.http.post(`${environment.apiUrl}/friends/requests/${requestId}/accept`, {}).toPromise();
  }

  async rejectFriendRequest(requestId: string): Promise<void> {
    await this.http.post(`${environment.apiUrl}/friends/requests/${requestId}/reject`, {}).toPromise();
  }

  async removeFriend(friendId: string): Promise<void> {
    await this.http.delete(`${environment.apiUrl}/users/friends/${friendId}`).toPromise();
  }

  async getFriends(): Promise<AppUser[]> {
    const friends = await this.http.get<AppUser[]>(`${environment.apiUrl}/users/friends`).toPromise();
    return friends || [];
  }
}
