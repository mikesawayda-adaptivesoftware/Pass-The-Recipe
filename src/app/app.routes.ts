import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'recipes',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/components/register/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'recipes',
    loadComponent: () => import('./features/recipes/components/recipe-list/recipe-list.component').then(m => m.RecipeListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'recipes/new',
    loadComponent: () => import('./features/recipes/components/recipe-form/recipe-form.component').then(m => m.RecipeFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'recipes/:id',
    loadComponent: () => import('./features/recipes/components/recipe-detail/recipe-detail.component').then(m => m.RecipeDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'recipes/:id/edit',
    loadComponent: () => import('./features/recipes/components/recipe-form/recipe-form.component').then(m => m.RecipeFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'shared',
    loadComponent: () => import('./features/recipes/components/shared-recipes/shared-recipes.component').then(m => m.SharedRecipesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'favorites',
    loadComponent: () => import('./features/recipes/components/favorites/favorites.component').then(m => m.FavoritesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'friends',
    loadComponent: () => import('./features/friends/components/friends-list/friends-list.component').then(m => m.FriendsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'import',
    loadComponent: () => import('./features/import/components/import-page/import-page.component').then(m => m.ImportPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'unparsed',
    loadComponent: () => import('./features/recipes/components/unparsed-ingredients/unparsed-ingredients.component').then(m => m.UnparsedIngredientsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'shopping',
    loadComponent: () => import('./features/shopping/components/shopping-lists/shopping-lists.component').then(m => m.ShoppingListsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'shopping/:id',
    loadComponent: () => import('./features/shopping/components/shopping-list-detail/shopping-list-detail.component').then(m => m.ShoppingListDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/components/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'recipes'
  }
];
