export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt?: Date;
  friends?: AppUser[];
  shareAllRecipesWithFriends?: boolean;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  fromUserName: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  user: AppUser;
}
