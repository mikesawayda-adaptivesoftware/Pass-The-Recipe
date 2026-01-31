import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RecipesModule } from './recipes/recipes.module';
import { FriendsModule } from './friends/friends.module';
import { MealieUsersModule } from './mealie-users/mealie-users.module';
import { ShoppingListsModule } from './shopping-lists/shopping-lists.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { User, Recipe, FriendRequest, MealieUser, ShoppingList, ShoppingListItem, KnownIngredient, KnownUnit, KnownModifier } from './common/entities';

@Module({
  imports: [
    // SQLite Database
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH || './data/pass-the-recipe.db',
      entities: [User, Recipe, FriendRequest, MealieUser, ShoppingList, ShoppingListItem, KnownIngredient, KnownUnit, KnownModifier],
      synchronize: true, // Auto-create tables (disable in production)
      logging: process.env.NODE_ENV === 'development',
    }),
    // Serve Angular static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api{/*path}', '/uploads{/*path}'],
    }),
    // Feature modules
    AuthModule,
    UsersModule,
    RecipesModule,
    FriendsModule,
    MealieUsersModule,
    ShoppingListsModule,
    IngredientsModule,
  ],
})
export class AppModule {}
