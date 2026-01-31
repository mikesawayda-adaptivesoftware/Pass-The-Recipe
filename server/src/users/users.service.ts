import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Recipe } from '../common/entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      select: ['id', 'email', 'displayName', 'photoURL'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['friends'],
    });
  }

  async getFriends(userId: string): Promise<Partial<User>[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['friends'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.friends.map((friend) => ({
      id: friend.id,
      email: friend.email,
      displayName: friend.displayName,
      photoURL: friend.photoURL,
    }));
  }

  async addFriend(userId: string, friendId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['friends'],
    });

    const friend = await this.userRepository.findOne({
      where: { id: friendId },
      relations: ['friends'],
    });

    if (!user || !friend) {
      throw new NotFoundException('User not found');
    }

    // Add bidirectional friendship
    if (!user.friends.some((f) => f.id === friendId)) {
      user.friends.push(friend);
      await this.userRepository.save(user);
    }

    if (!friend.friends.some((f) => f.id === userId)) {
      friend.friends.push(user);
      await this.userRepository.save(friend);
    }
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['friends'],
    });

    const friend = await this.userRepository.findOne({
      where: { id: friendId },
      relations: ['friends'],
    });

    if (!user || !friend) {
      throw new NotFoundException('User not found');
    }

    user.friends = user.friends.filter((f) => f.id !== friendId);
    await this.userRepository.save(user);

    friend.friends = friend.friends.filter((f) => f.id !== userId);
    await this.userRepository.save(friend);
  }

  async updateSettings(
    userId: string,
    settings: { shareAllRecipesWithFriends?: boolean },
  ): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (settings.shareAllRecipesWithFriends !== undefined) {
      user.shareAllRecipesWithFriends = settings.shareAllRecipesWithFriends;
    }

    await this.userRepository.save(user);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      shareAllRecipesWithFriends: user.shareAllRecipesWithFriends,
    };
  }

  async getFavorites(userId: string): Promise<Recipe[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['favoriteRecipes', 'favoriteRecipes.owner', 'favoriteRecipes.originalMealieUser'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Sanitize owner data (remove password)
    return user.favoriteRecipes.map((recipe) => {
      if (recipe.owner) {
        const { password, ...ownerWithoutPassword } = recipe.owner;
        return {
          ...recipe,
          owner: ownerWithoutPassword,
        } as unknown as Recipe;
      }
      return recipe;
    });
  }

  async addFavorite(userId: string, recipeId: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['favoriteRecipes'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check if already favorited
    if (!user.favoriteRecipes.some((r) => r.id === recipeId)) {
      user.favoriteRecipes.push(recipe);
      await this.userRepository.save(user);
    }

    return { success: true };
  }

  async removeFavorite(userId: string, recipeId: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['favoriteRecipes'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.favoriteRecipes = user.favoriteRecipes.filter((r) => r.id !== recipeId);
    await this.userRepository.save(user);

    return { success: true };
  }

  async isFavorite(userId: string, recipeId: string): Promise<{ isFavorite: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['favoriteRecipes'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isFavorite = user.favoriteRecipes.some((r) => r.id === recipeId);
    return { isFavorite };
  }
}

