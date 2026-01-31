import { IsString, IsUUID } from 'class-validator';

export class SendFriendRequestDto {
  @IsUUID()
  toUserId: string;
}

export class FriendRequestResponseDto {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  fromUserName: string;
  toUserId: string;
  status: string;
  createdAt: Date;
}

