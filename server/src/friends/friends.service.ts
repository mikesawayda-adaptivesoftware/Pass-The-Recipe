import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendRequest, User } from '../common/entities';
import { UsersService } from '../users/users.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
  ) {}

  async sendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest> {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const toUser = await this.userRepository.findOne({ where: { id: toUserId } });
    if (!toUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already friends
    const fromUser = await this.userRepository.findOne({
      where: { id: fromUserId },
      relations: ['friends'],
    });

    if (fromUser?.friends.some((f) => f.id === toUserId)) {
      throw new ConflictException('Already friends with this user');
    }

    // Check for existing pending request
    const existingRequest = await this.friendRequestRepository.findOne({
      where: {
        fromUserId,
        toUserId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      throw new ConflictException('Friend request already pending');
    }

    // Check for reverse request - auto accept
    const reverseRequest = await this.friendRequestRepository.findOne({
      where: {
        fromUserId: toUserId,
        toUserId: fromUserId,
        status: 'pending',
      },
    });

    if (reverseRequest) {
      return this.acceptRequest(reverseRequest.id, fromUserId);
    }

    const request = this.friendRequestRepository.create({
      fromUserId,
      toUserId,
      status: 'pending',
    });

    return this.friendRequestRepository.save(request);
  }

  async getPendingRequests(userId: string): Promise<any[]> {
    const requests = await this.friendRequestRepository.find({
      where: { toUserId: userId, status: 'pending' },
      relations: ['fromUser'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((r) => ({
      id: r.id,
      fromUserId: r.fromUserId,
      fromUserEmail: r.fromUser.email,
      fromUserName: r.fromUser.displayName,
      toUserId: r.toUserId,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  async getSentRequests(userId: string): Promise<any[]> {
    const requests = await this.friendRequestRepository.find({
      where: { fromUserId: userId, status: 'pending' },
      relations: ['toUser'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((r) => ({
      id: r.id,
      fromUserId: r.fromUserId,
      toUserId: r.toUserId,
      toUserEmail: r.toUser.email,
      toUserName: r.toUser.displayName,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  async acceptRequest(requestId: string, userId: string): Promise<FriendRequest> {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.toUserId !== userId) {
      throw new BadRequestException('Not authorized to accept this request');
    }

    // Add friends
    await this.usersService.addFriend(request.fromUserId, request.toUserId);

    // Update request status
    request.status = 'accepted';
    return this.friendRequestRepository.save(request);
  }

  async rejectRequest(requestId: string, userId: string): Promise<FriendRequest> {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.toUserId !== userId) {
      throw new BadRequestException('Not authorized to reject this request');
    }

    request.status = 'rejected';
    return this.friendRequestRepository.save(request);
  }
}

