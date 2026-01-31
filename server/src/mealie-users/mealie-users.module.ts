import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealieUsersController } from './mealie-users.controller';
import { MealieUsersService } from './mealie-users.service';
import { MealieUser } from '../common/entities/mealie-user.entity';
import { User } from '../common/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MealieUser, User])],
  controllers: [MealieUsersController],
  providers: [MealieUsersService],
  exports: [MealieUsersService],
})
export class MealieUsersModule {}

