import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MealieUser } from '../common/entities/mealie-user.entity';
import { User } from '../common/entities/user.entity';

export interface MealieUserImportDto {
  mealieId: string;
  fullName: string;
  username?: string;
  email?: string;
}

@Injectable()
export class MealieUsersService {
  constructor(
    @InjectRepository(MealieUser)
    private mealieUserRepository: Repository<MealieUser>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Bulk insert/update Mealie users from import
   */
  async upsertFromImport(
    mealieUsers: MealieUserImportDto[],
  ): Promise<MealieUser[]> {
    const results: MealieUser[] = [];

    for (const dto of mealieUsers) {
      // Check if this Mealie user already exists
      let mealieUser = await this.mealieUserRepository.findOne({
        where: { mealieId: dto.mealieId },
      });

      if (mealieUser) {
        // Update existing record
        mealieUser.fullName = dto.fullName;
        mealieUser.username = dto.username || mealieUser.username;
        mealieUser.email = dto.email || mealieUser.email;
      } else {
        // Create new record
        mealieUser = this.mealieUserRepository.create({
          mealieId: dto.mealieId,
          fullName: dto.fullName,
          username: dto.username,
          email: dto.email,
        });
      }

      const saved = await this.mealieUserRepository.save(mealieUser);
      results.push(saved);
    }

    return results;
  }

  /**
   * Find a Mealie user by their original Mealie ID
   */
  async findByMealieId(mealieId: string): Promise<MealieUser | null> {
    return this.mealieUserRepository.findOne({
      where: { mealieId },
      relations: ['linkedUser'],
    });
  }

  /**
   * Find multiple Mealie users by their original Mealie IDs
   */
  async findByMealieIds(mealieIds: string[]): Promise<MealieUser[]> {
    if (mealieIds.length === 0) return [];
    return this.mealieUserRepository.find({
      where: { mealieId: In(mealieIds) },
      relations: ['linkedUser'],
    });
  }

  /**
   * Manually link a Mealie user to an app account
   */
  async linkToUser(mealieUserId: string, userId: string): Promise<MealieUser> {
    const mealieUser = await this.mealieUserRepository.findOne({
      where: { id: mealieUserId },
    });

    if (!mealieUser) {
      throw new NotFoundException('Mealie user not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    mealieUser.linkedUserId = userId;
    return this.mealieUserRepository.save(mealieUser);
  }

  /**
   * Unlink a Mealie user from an app account
   */
  async unlinkUser(mealieUserId: string): Promise<MealieUser> {
    const mealieUser = await this.mealieUserRepository.findOne({
      where: { id: mealieUserId },
    });

    if (!mealieUser) {
      throw new NotFoundException('Mealie user not found');
    }

    mealieUser.linkedUserId = null;
    return this.mealieUserRepository.save(mealieUser);
  }

  /**
   * Auto-link Mealie users to app accounts by matching email addresses
   */
  async autoLinkByEmail(): Promise<{ linked: number; details: string[] }> {
    // Find all Mealie users that have an email and are not yet linked
    const unlinkedMealieUsers = await this.mealieUserRepository.find({
      where: { linkedUserId: null as unknown as string },
    });

    const linkedDetails: string[] = [];
    let linkedCount = 0;

    for (const mealieUser of unlinkedMealieUsers) {
      if (!mealieUser.email) continue;

      // Find a user with matching email
      const user = await this.userRepository.findOne({
        where: { email: mealieUser.email.toLowerCase() },
      });

      if (user) {
        mealieUser.linkedUserId = user.id;
        await this.mealieUserRepository.save(mealieUser);
        linkedCount++;
        linkedDetails.push(
          `Linked "${mealieUser.fullName}" to user "${user.displayName}"`,
        );
      }
    }

    return { linked: linkedCount, details: linkedDetails };
  }

  /**
   * Get all imported Mealie users
   */
  async findAll(): Promise<MealieUser[]> {
    return this.mealieUserRepository.find({
      relations: ['linkedUser'],
      order: { fullName: 'ASC' },
    });
  }

  /**
   * Get a single Mealie user by ID
   */
  async findOne(id: string): Promise<MealieUser | null> {
    return this.mealieUserRepository.findOne({
      where: { id },
      relations: ['linkedUser'],
    });
  }
}

