import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto, UpdateRecipeDto } from './dto/recipe.dto';

@Controller('api/recipes')
@UseGuards(AuthGuard('jwt'))
export class RecipesController {
  constructor(private recipesService: RecipesService) {}

  @Post()
  async create(@Request() req, @Body() createDto: CreateRecipeDto) {
    return this.recipesService.create(req.user.id, createDto);
  }

  @Get()
  async findMyRecipes(@Request() req) {
    return this.recipesService.findMyRecipes(req.user.id);
  }

  @Get('shared')
  async findSharedWithMe(@Request() req) {
    return this.recipesService.findSharedWithMe(req.user.id);
  }

  @Get('unparsed')
  async findWithUnparsedIngredients(@Request() req) {
    return this.recipesService.findWithUnparsedIngredients(req.user.id);
  }

  @Post('migrate')
  async migrateExistingRecipes() {
    return this.recipesService.migrateExistingRecipes();
  }

  @Post('fix-unparsed-flags')
  async fixUnparsedFlags(@Request() req) {
    return this.recipesService.fixUnparsedFlags(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.recipesService.findOne(id, req.user.id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateRecipeDto,
  ) {
    return this.recipesService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    await this.recipesService.delete(id, req.user.id);
    return { success: true };
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const filename = `${uuidv4()}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif|webp)/)) {
          cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadImage(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/${file.filename}`;
    return this.recipesService.updateImage(id, req.user.id, imageUrl);
  }

  @Post('parse-ingredient')
  parseIngredient(@Body('text') text: string) {
    return this.recipesService.parseIngredient(text);
  }

  @Put(':id/ingredients/:index')
  async updateIngredient(
    @Request() req,
    @Param('id') id: string,
    @Param('index') index: string,
    @Body() updatedIngredient: any,
  ) {
    return this.recipesService.updateIngredient(
      id,
      req.user.id,
      parseInt(index, 10),
      updatedIngredient,
    );
  }

  @Post(':id/ingredients/:index/split')
  async splitIngredient(
    @Request() req,
    @Param('id') id: string,
    @Param('index') index: string,
    @Body() body: { ingredients: any[] },
  ) {
    return this.recipesService.splitIngredient(
      id,
      req.user.id,
      parseInt(index, 10),
      body.ingredients,
    );
  }
}

