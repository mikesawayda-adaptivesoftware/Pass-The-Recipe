import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/friend-request.dto';

@Controller('api/friends')
@UseGuards(AuthGuard('jwt'))
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Post('requests')
  async sendRequest(@Request() req, @Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendRequest(req.user.id, dto.toUserId);
  }

  @Get('requests/pending')
  async getPendingRequests(@Request() req) {
    return this.friendsService.getPendingRequests(req.user.id);
  }

  @Get('requests/sent')
  async getSentRequests(@Request() req) {
    return this.friendsService.getSentRequests(req.user.id);
  }

  @Post('requests/:id/accept')
  async acceptRequest(@Request() req, @Param('id') id: string) {
    return this.friendsService.acceptRequest(id, req.user.id);
  }

  @Post('requests/:id/reject')
  async rejectRequest(@Request() req, @Param('id') id: string) {
    return this.friendsService.rejectRequest(id, req.user.id);
  }
}

