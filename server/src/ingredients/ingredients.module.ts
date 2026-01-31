import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';
import { SeedService } from './seed.service';
import { KnownIngredient, KnownUnit, KnownModifier } from '../common/entities';
import {
  INGREDIENT_PARSER,
  RulesIngredientParser,
  LlmIngredientParser,
} from './parsers';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnownIngredient, KnownUnit, KnownModifier]),
  ],
  controllers: [IngredientsController],
  providers: [
    IngredientsService,
    SeedService,
    RulesIngredientParser,
    LlmIngredientParser,
    {
      provide: INGREDIENT_PARSER,
      useFactory: (rules: RulesIngredientParser, llm: LlmIngredientParser) => {
        // Switch parser based on environment variable
        // INGREDIENT_PARSER_TYPE=llm or INGREDIENT_PARSER_TYPE=rules (default)
        const parserType = process.env.INGREDIENT_PARSER_TYPE || 'rules';
        if (parserType === 'llm') {
          console.log('[IngredientsModule] Using LLM ingredient parser');
          return llm;
        }
        console.log('[IngredientsModule] Using rules-based ingredient parser');
        return rules;
      },
      inject: [RulesIngredientParser, LlmIngredientParser],
    },
  ],
  exports: [IngredientsService, INGREDIENT_PARSER],
})
export class IngredientsModule {}
