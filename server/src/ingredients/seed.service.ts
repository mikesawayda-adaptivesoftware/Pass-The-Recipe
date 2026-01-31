import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KnownIngredient,
  KnownUnit,
  KnownModifier,
  IngredientCategory,
  UnitType,
  ModifierType,
} from '../common/entities';

interface IngredientSeed {
  name: string;
  category: IngredientCategory;
  aliases?: string[];
  defaultUnit?: string;
}

interface UnitSeed {
  name: string;
  abbreviation?: string;
  aliases?: string[];
  type: UnitType;
  baseUnit?: string;
  conversionToBase?: number;
}

interface ModifierSeed {
  name: string;
  type: ModifierType;
  aliases?: string[];
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(KnownIngredient)
    private ingredientRepo: Repository<KnownIngredient>,
    @InjectRepository(KnownUnit)
    private unitRepo: Repository<KnownUnit>,
    @InjectRepository(KnownModifier)
    private modifierRepo: Repository<KnownModifier>,
  ) {}

  async onModuleInit() {
    await this.seedAll();
  }

  async seedAll() {
    // Always try to add missing ingredients, units, and modifiers
    await this.seedIngredients();
    await this.seedUnits();
    await this.seedModifiers();
  }

  private async seedIngredients() {
    const ingredients: IngredientSeed[] = [
      // Proteins
      { name: 'Chicken Breast', category: 'protein', aliases: ['chicken breasts', 'breast of chicken'], defaultUnit: 'lb' },
      { name: 'Chicken Thigh', category: 'protein', aliases: ['chicken thighs'], defaultUnit: 'lb' },
      { name: 'Chicken', category: 'protein', aliases: ['whole chicken', 'chicken wings'], defaultUnit: 'lb' },
      { name: 'Ground Beef', category: 'protein', aliases: ['beef mince', 'minced beef', 'hamburger meat'], defaultUnit: 'lb' },
      { name: 'Beef Steak', category: 'protein', aliases: ['steak', 'beefsteak'], defaultUnit: 'lb' },
      { name: 'Chuck Roast', category: 'protein', aliases: ['beef chuck', 'pot roast', 'chuck', 'beef chuck pot roast', 'chuck pot roast'], defaultUnit: 'lb' },
      { name: 'Flank Steak', category: 'protein', aliases: ['flank'], defaultUnit: 'lb' },
      { name: 'Round Steak', category: 'protein', aliases: ['beef round', 'top round'], defaultUnit: 'lb' },
      { name: 'Beef Shin', category: 'protein', aliases: ['beef shank', 'shin beef'], defaultUnit: 'lb' },
      { name: 'Pork Chop', category: 'protein', aliases: ['pork chops'], defaultUnit: 'piece' },
      { name: 'Ground Pork', category: 'protein', aliases: ['pork mince', 'minced pork'], defaultUnit: 'lb' },
      { name: 'Pork Ribs', category: 'protein', aliases: ['ribs', 'spare ribs', 'baby back ribs', 'country-style pork ribs', 'st. louis ribs', 'st. louis or baby back ribs'], defaultUnit: 'lb' },
      { name: 'Pork Bones', category: 'protein', aliases: ['pork neck bones', 'neck bones', 'pork bone'], defaultUnit: 'lb' },
      { name: 'Pigs Feet', category: 'protein', aliases: ['pigs trotters', 'pig feet', 'pig trotters'], defaultUnit: 'lb' },
      { name: 'Beef Bones', category: 'protein', aliases: ['beef bone', 'marrow bones', 'soup bones'], defaultUnit: 'lb' },
      { name: 'Pork Tenderloin', category: 'protein', aliases: ['pork loin', 'tenderloin'], defaultUnit: 'lb' },
      { name: 'Bacon', category: 'protein', aliases: ['streaky bacon', 'bacon strips'], defaultUnit: 'slice' },
      { name: 'Salmon', category: 'protein', aliases: ['salmon fillet', 'salmon filet'], defaultUnit: 'lb' },
      { name: 'Shrimp', category: 'protein', aliases: ['prawns', 'jumbo shrimp'], defaultUnit: 'lb' },
      { name: 'Tuna', category: 'protein', aliases: ['tuna steak', 'canned tuna'], defaultUnit: 'oz' },
      { name: 'Turkey', category: 'protein', aliases: ['turkey breast', 'ground turkey'], defaultUnit: 'lb' },
      { name: 'Sausage', category: 'protein', aliases: ['sausages', 'italian sausage', 'pork sausage'], defaultUnit: 'piece' },
      { name: 'Kielbasa', category: 'protein', aliases: ['polish sausage', 'kielbassa'], defaultUnit: 'piece' },
      { name: 'Beef Short Ribs', category: 'protein', aliases: ['short ribs', 'beef ribs'], defaultUnit: 'lb' },
      { name: 'Sirloin Steak', category: 'protein', aliases: ['sirloin', 'top sirloin'], defaultUnit: 'lb' },
      { name: 'Steak', category: 'protein', aliases: ['steaks', 'beef steak', 'hangar steak', 'skirt steak', 'hanger steak'], defaultUnit: 'lb' },
      { name: 'Pork Belly', category: 'protein', aliases: ['belly pork'], defaultUnit: 'lb' },
      { name: 'Pork Shoulder', category: 'protein', aliases: ['pork butt', 'boston butt', 'pork butt or leg joint'], defaultUnit: 'lb' },
      { name: 'Ham', category: 'protein', aliases: ['boiled ham', 'deli ham', 'smoked ham'], defaultUnit: 'lb' },
      { name: 'Capicola', category: 'protein', aliases: ['capocollo', 'coppa'], defaultUnit: 'lb' },
      { name: 'Salami', category: 'protein', aliases: ['genoa salami', 'italian salami'], defaultUnit: 'lb' },
      { name: 'Pepperoni', category: 'protein', aliases: ['sliced pepperoni'], defaultUnit: 'oz' },
      { name: 'Cod', category: 'protein', aliases: ['cod fillet', 'cod or halibut'], defaultUnit: 'lb' },
      { name: 'Halibut', category: 'protein', aliases: ['halibut fillet'], defaultUnit: 'lb' },
      { name: 'Tofu', category: 'protein', aliases: ['bean curd'], defaultUnit: 'oz' },
      { name: 'Egg', category: 'protein', aliases: ['eggs', 'large egg', 'large eggs', 'egg yolks', 'egg whites'], defaultUnit: 'piece' },

      // Produce - Vegetables
      { name: 'Onion', category: 'produce', aliases: ['onions', 'yellow onion', 'white onion'], defaultUnit: 'piece' },
      { name: 'Garlic', category: 'produce', aliases: ['garlic clove', 'garlic cloves'], defaultUnit: 'clove' },
      { name: 'Tomato', category: 'produce', aliases: ['tomatoes', 'roma tomato'], defaultUnit: 'piece' },
      { name: 'Potato', category: 'produce', aliases: ['potatoes', 'russet potato', 'yukon gold'], defaultUnit: 'piece' },
      { name: 'Carrot', category: 'produce', aliases: ['carrots'], defaultUnit: 'piece' },
      { name: 'Celery', category: 'produce', aliases: ['celery stalk', 'celery stalks'], defaultUnit: 'stalk' },
      { name: 'Bell Pepper', category: 'produce', aliases: ['bell peppers', 'capsicum', 'red pepper', 'green pepper'], defaultUnit: 'piece' },
      { name: 'Broccoli', category: 'produce', aliases: ['broccoli florets'], defaultUnit: 'cup' },
      { name: 'Spinach', category: 'produce', aliases: ['baby spinach', 'fresh spinach'], defaultUnit: 'cup' },
      { name: 'Lettuce', category: 'produce', aliases: ['romaine lettuce', 'iceberg lettuce'], defaultUnit: 'head' },
      { name: 'Mushroom', category: 'produce', aliases: ['mushrooms', 'button mushrooms', 'cremini'], defaultUnit: 'cup' },
      { name: 'Zucchini', category: 'produce', aliases: ['courgette', 'summer squash'], defaultUnit: 'piece' },
      { name: 'Cucumber', category: 'produce', aliases: ['cucumbers'], defaultUnit: 'piece' },
      { name: 'Green Beans', category: 'produce', aliases: ['string beans', 'snap beans'], defaultUnit: 'cup' },
      { name: 'Corn', category: 'produce', aliases: ['sweet corn', 'corn kernels'], defaultUnit: 'cup' },
      { name: 'Peas', category: 'produce', aliases: ['green peas', 'frozen peas'], defaultUnit: 'cup' },
      { name: 'Black Beans', category: 'produce', aliases: ['canned black beans', 'black bean'], defaultUnit: 'can' },
      { name: 'Kidney Beans', category: 'produce', aliases: ['red kidney beans', 'canned kidney beans'], defaultUnit: 'can' },
      { name: 'Pinto Beans', category: 'produce', aliases: ['canned pinto beans'], defaultUnit: 'can' },
      { name: 'Chickpeas', category: 'produce', aliases: ['garbanzo beans', 'canned chickpeas'], defaultUnit: 'can' },
      { name: 'Lentils', category: 'produce', aliases: ['red lentils', 'green lentils', 'brown lentils'], defaultUnit: 'cup' },
      { name: 'Asparagus', category: 'produce', aliases: ['asparagus spears'], defaultUnit: 'bunch' },
      { name: 'Cauliflower', category: 'produce', aliases: ['cauliflower florets'], defaultUnit: 'head' },
      { name: 'Cabbage', category: 'produce', aliases: ['green cabbage', 'red cabbage'], defaultUnit: 'head' },
      { name: 'Kale', category: 'produce', aliases: ['curly kale'], defaultUnit: 'bunch' },
      { name: 'Ginger', category: 'produce', aliases: ['fresh ginger', 'ginger root'], defaultUnit: 'inch' },
      { name: 'Jalapeño', category: 'produce', aliases: ['jalapeno', 'jalapeño pepper'], defaultUnit: 'piece' },
      { name: 'Serrano Pepper', category: 'produce', aliases: ['serrano', 'serrano chile'], defaultUnit: 'piece' },
      { name: 'Poblano Pepper', category: 'produce', aliases: ['poblano', 'poblano chile', 'poblano chile pepper', 'poblano chili pepper'], defaultUnit: 'piece' },
      { name: 'Hungarian Pepper', category: 'produce', aliases: ['hungarian red pepper', 'hungarian wax pepper'], defaultUnit: 'piece' },
      { name: 'Pepperoncini', category: 'produce', aliases: ['pepperoncini peppers', 'pepperoncino'], defaultUnit: 'piece' },
      { name: 'Green Pepper', category: 'produce', aliases: ['green bell pepper', 'green peppers'], defaultUnit: 'piece' },
      { name: 'Red Pepper', category: 'produce', aliases: ['red bell pepper', 'red peppers'], defaultUnit: 'piece' },
      { name: 'Shallot', category: 'produce', aliases: ['shallots'], defaultUnit: 'piece' },
      { name: 'Avocado', category: 'produce', aliases: ['avocados'], defaultUnit: 'piece' },
      { name: 'Green Onion', category: 'produce', aliases: ['scallion', 'scallions', 'spring onion', 'green onions'], defaultUnit: 'piece' },
      { name: 'Bean Sprouts', category: 'produce', aliases: ['mung bean sprouts', 'sprouts'], defaultUnit: 'cup' },
      { name: 'Bok Choy', category: 'produce', aliases: ['bok choy leaves', 'baby bok choy', 'pak choi'], defaultUnit: 'cup' },
      { name: 'Arugula', category: 'produce', aliases: ['arugula leaves', 'rocket'], defaultUnit: 'cup' },
      { name: 'Artichoke Hearts', category: 'produce', aliases: ['artichoke', 'canned artichoke hearts'], defaultUnit: 'can' },
      { name: 'Plantains', category: 'produce', aliases: ['plantain', 'green plantains'], defaultUnit: 'piece' },
      { name: 'Mango', category: 'produce', aliases: ['mangoes', 'ripe mango'], defaultUnit: 'piece' },
      { name: 'Strawberries', category: 'produce', aliases: ['strawberry', 'fresh strawberries'], defaultUnit: 'cup' },
      { name: 'Yuca', category: 'produce', aliases: ['cassava', 'yucca'], defaultUnit: 'piece' },
      { name: 'Spaghetti Squash', category: 'produce', aliases: ['squash'], defaultUnit: 'piece' },
      { name: 'Chives', category: 'produce', aliases: ['fresh chives'], defaultUnit: 'tablespoon' },
      { name: 'Green Chiles', category: 'produce', aliases: ['green chilis', 'hatch green chiles', 'canned green chiles'], defaultUnit: 'can' },
      { name: 'Habanero', category: 'produce', aliases: ['habanero pepper', 'habanero peppers'], defaultUnit: 'piece' },
      { name: 'Cherry Peppers', category: 'produce', aliases: ['hot cherry peppers', 'pickled cherry peppers'], defaultUnit: 'piece' },
      { name: 'Thai Chili', category: 'produce', aliases: ['thai chilis', 'birds eye chili', 'birds eye chiles', 'dried thai chilis'], defaultUnit: 'piece' },
      { name: 'Red Chili Pepper', category: 'produce', aliases: ['red chili', 'red chile pepper', 'long red chili', 'dried red chili'], defaultUnit: 'piece' },
      { name: 'Sichuan Chili', category: 'produce', aliases: ['sichuan chilis', 'sichuan dried chilis', 'szechuan chili', 'facing heaven chili'], defaultUnit: 'piece' },

      // Produce - Fruits
      { name: 'Lemon', category: 'produce', aliases: ['lemons'], defaultUnit: 'piece' },
      { name: 'Lime', category: 'produce', aliases: ['limes'], defaultUnit: 'piece' },
      { name: 'Orange', category: 'produce', aliases: ['oranges'], defaultUnit: 'piece' },
      { name: 'Apple', category: 'produce', aliases: ['apples'], defaultUnit: 'piece' },
      { name: 'Banana', category: 'produce', aliases: ['bananas'], defaultUnit: 'piece' },
      { name: 'Strawberry', category: 'produce', aliases: ['strawberries'], defaultUnit: 'cup' },
      { name: 'Blueberry', category: 'produce', aliases: ['blueberries'], defaultUnit: 'cup' },
      
      // Specialty produce
      { name: 'Cherry Tomatoes', category: 'produce', aliases: ['cherry tomato', 'grape tomatoes'], defaultUnit: 'cup' },
      { name: 'Roma Tomatoes', category: 'produce', aliases: ['roma tomato', 'plum tomatoes'], defaultUnit: 'piece' },
      { name: 'San Marzano Tomatoes', category: 'produce', aliases: ['san marzano'], defaultUnit: 'can' },
      { name: 'Kalamata Olives', category: 'produce', aliases: ['kalamata', 'greek olives'], defaultUnit: 'cup' },
      { name: 'Black Olives', category: 'produce', aliases: ['ripe olives', 'sliced olives'], defaultUnit: 'can' },
      { name: 'Green Olives', category: 'produce', aliases: ['spanish olives', 'manzanilla olives'], defaultUnit: 'cup' },

      // Dairy
      { name: 'Milk', category: 'dairy', aliases: ['whole milk', '2% milk', 'skim milk'], defaultUnit: 'cup' },
      { name: 'Half-and-Half', category: 'dairy', aliases: ['half and half', 'half & half'], defaultUnit: 'cup' },
      { name: 'Butter', category: 'dairy', aliases: ['unsalted butter', 'salted butter'], defaultUnit: 'tablespoon' },
      { name: 'Cheddar Cheese', category: 'dairy', aliases: ['cheddar', 'sharp cheddar', 'mexican cheese blend'], defaultUnit: 'cup' },
      { name: 'Mozzarella', category: 'dairy', aliases: ['mozzarella cheese', 'fresh mozzarella'], defaultUnit: 'cup' },
      { name: 'Parmesan', category: 'dairy', aliases: ['parmesan cheese', 'parmigiano reggiano'], defaultUnit: 'cup' },
      { name: 'Cream Cheese', category: 'dairy', aliases: ['philadelphia'], defaultUnit: 'oz' },
      { name: 'Sour Cream', category: 'dairy', aliases: ['soured cream'], defaultUnit: 'cup' },
      { name: 'Heavy Cream', category: 'dairy', aliases: ['heavy whipping cream', 'whipping cream', 'double cream'], defaultUnit: 'cup' },
      { name: 'Yogurt', category: 'dairy', aliases: ['plain yogurt', 'greek yogurt', 'nonfat yogurt'], defaultUnit: 'cup' },
      { name: 'Feta Cheese', category: 'dairy', aliases: ['feta', 'crumbled feta', 'goat cheese'], defaultUnit: 'cup' },
      { name: 'Ricotta', category: 'dairy', aliases: ['ricotta cheese'], defaultUnit: 'cup' },
      { name: 'Gouda Cheese', category: 'dairy', aliases: ['gouda', 'smoked gouda'], defaultUnit: 'cup' },
      { name: 'Monterey Jack Cheese', category: 'dairy', aliases: ['monterey jack', 'pepper jack'], defaultUnit: 'cup' },
      { name: 'Blue Cheese', category: 'dairy', aliases: ['blue cheese crumbles', 'gorgonzola'], defaultUnit: 'oz' },
      { name: 'Provolone Cheese', category: 'dairy', aliases: ['provolone', 'sliced provolone'], defaultUnit: 'oz' },
      { name: 'Cotija Cheese', category: 'dairy', aliases: ['cotija', 'queso cotija'], defaultUnit: 'cup' },
      { name: 'Mexican Cheese Blend', category: 'dairy', aliases: ['mexican cheese', 'mexican blend cheese', 'queso'], defaultUnit: 'cup' },
      { name: 'Cottage Cheese', category: 'dairy', aliases: ['small curd cottage cheese'], defaultUnit: 'cup' },

      // Pantry
      { name: 'Olive Oil', category: 'pantry', aliases: ['extra virgin olive oil', 'evoo'], defaultUnit: 'tablespoon' },
      { name: 'Vegetable Oil', category: 'pantry', aliases: ['canola oil', 'cooking oil'], defaultUnit: 'tablespoon' },
      { name: 'Sesame Oil', category: 'pantry', aliases: ['toasted sesame oil'], defaultUnit: 'tablespoon' },
      { name: 'Ghee', category: 'pantry', aliases: ['clarified butter'], defaultUnit: 'tablespoon' },
      { name: 'Pork Fat', category: 'pantry', aliases: ['lard', 'rendered pork fat'], defaultUnit: 'tablespoon' },
      { name: 'Chicken Broth', category: 'pantry', aliases: ['chicken stock', 'chicken bouillon'], defaultUnit: 'cup' },
      { name: 'Beef Broth', category: 'pantry', aliases: ['beef stock'], defaultUnit: 'cup' },
      { name: 'Vegetable Broth', category: 'pantry', aliases: ['vegetable stock'], defaultUnit: 'cup' },
      { name: 'Water', category: 'pantry', aliases: ['cold water', 'warm water', 'hot water'], defaultUnit: 'cup' },
      { name: 'Soy Sauce', category: 'pantry', aliases: ['shoyu', 'tamari', 'coconut aminos'], defaultUnit: 'tablespoon' },
      { name: 'Fish Sauce', category: 'pantry', aliases: ['nam pla', 'nuoc mam'], defaultUnit: 'tablespoon' },
      { name: 'Worcestershire Sauce', category: 'pantry', aliases: ['worcestershire'], defaultUnit: 'tablespoon' },
      { name: 'Hot Sauce', category: 'pantry', aliases: ['tabasco'], defaultUnit: 'teaspoon' },
      { name: 'Sriracha', category: 'pantry', aliases: ['sriracha sauce', 'red chili paste', 'chili paste', 'chile sauce', 'chili sauce'], defaultUnit: 'tablespoon' },
      { name: 'BBQ Sauce', category: 'pantry', aliases: ['barbecue sauce', 'bbq'], defaultUnit: 'cup' },
      { name: 'Tomato Sauce', category: 'pantry', aliases: ['marinara', 'pasta sauce'], defaultUnit: 'cup' },
      { name: 'Tomato Paste', category: 'pantry', aliases: ['tomato puree'], defaultUnit: 'tablespoon' },
      { name: 'Diced Tomatoes', category: 'pantry', aliases: ['canned tomatoes', 'crushed tomatoes', 'stewed tomatoes'], defaultUnit: 'can' },
      { name: 'Coconut Milk', category: 'pantry', aliases: ['coconut cream'], defaultUnit: 'can' },
      { name: 'Honey', category: 'pantry', aliases: ['raw honey'], defaultUnit: 'tablespoon' },
      { name: 'Maple Syrup', category: 'pantry', aliases: ['pure maple syrup'], defaultUnit: 'tablespoon' },
      { name: 'Vinegar', category: 'pantry', aliases: ['white vinegar', 'distilled vinegar', 'rice vinegar', 'rice wine vinegar'], defaultUnit: 'tablespoon' },
      { name: 'Balsamic Vinegar', category: 'pantry', aliases: ['balsamic'], defaultUnit: 'tablespoon' },
      { name: 'Apple Cider Vinegar', category: 'pantry', aliases: ['acv'], defaultUnit: 'tablespoon' },
      { name: 'Sherry', category: 'pantry', aliases: ['cooking sherry', 'dry sherry'], defaultUnit: 'cup' },
      { name: 'Rice Wine', category: 'pantry', aliases: ['mirin', 'sake', 'shaoxing wine'], defaultUnit: 'tablespoon' },
      { name: 'Dijon Mustard', category: 'pantry', aliases: ['dijon'], defaultUnit: 'tablespoon' },
      { name: 'Mayonnaise', category: 'pantry', aliases: ['mayo', 'paleo mayo', 'avocado mayo'], defaultUnit: 'tablespoon' },
      { name: 'Ketchup', category: 'pantry', aliases: ['catsup', 'tomato ketchup'], defaultUnit: 'tablespoon' },
      { name: 'Guacamole', category: 'pantry', aliases: ['guac'], defaultUnit: 'cup' },
      { name: 'Peanut Butter', category: 'pantry', aliases: ['creamy peanut butter', 'chunky peanut butter'], defaultUnit: 'tablespoon' },
      { name: 'Peanuts', category: 'pantry', aliases: ['unsalted peanuts', 'roasted peanuts'], defaultUnit: 'cup' },
      { name: 'Sesame Seeds', category: 'pantry', aliases: ['toasted sesame seeds', 'white sesame seeds', 'black sesame seeds'], defaultUnit: 'tablespoon' },
      { name: 'Seaweed', category: 'pantry', aliases: ['nori', 'dried seaweed', 'seasoned seaweed', 'toasted seaweed'], defaultUnit: 'piece' },
      { name: 'Gochujang', category: 'pantry', aliases: ['korean chili paste', 'gochujang paste'], defaultUnit: 'tablespoon' },
      { name: 'Kimchi', category: 'pantry', aliases: ['korean kimchi'], defaultUnit: 'cup' },
      { name: 'Kombu', category: 'pantry', aliases: ['kelp', 'dried kombu'], defaultUnit: 'piece' },
      { name: 'Bonito Flakes', category: 'pantry', aliases: ['katsuobushi', 'dried bonito'], defaultUnit: 'cup' },
      { name: 'Star Anise', category: 'pantry', aliases: ['whole star anise', 'star anise pods'], defaultUnit: 'piece' },
      { name: 'Chinese Five Spice', category: 'pantry', aliases: ['chinese 5 spice', 'five spice powder'], defaultUnit: 'teaspoon' },
      { name: 'Pepita Seeds', category: 'pantry', aliases: ['pumpkin seeds', 'pepitas'], defaultUnit: 'cup' },
      { name: 'Pretzels', category: 'pantry', aliases: ['pretzel', 'pretzel pieces'], defaultUnit: 'cup' },
      { name: 'Sub Roll', category: 'pantry', aliases: ['hoagie roll', 'hero roll', 'italian roll'], defaultUnit: 'piece' },
      { name: 'Sourdough Starter', category: 'pantry', aliases: ['starter', 'sourdough starter discard', 'active starter'], defaultUnit: 'cup' },
      { name: 'Almonds', category: 'pantry', aliases: ['sliced almonds', 'slivered almonds', 'almond'], defaultUnit: 'cup' },
      { name: 'Walnuts', category: 'pantry', aliases: ['walnut', 'chopped walnuts'], defaultUnit: 'cup' },
      { name: 'Cashews', category: 'pantry', aliases: ['cashew', 'roasted cashews'], defaultUnit: 'cup' },
      { name: 'Pine Nuts', category: 'pantry', aliases: ['pignoli', 'pinon nuts'], defaultUnit: 'tablespoon' },
      { name: 'Lemon Juice', category: 'pantry', aliases: ['fresh lemon juice'], defaultUnit: 'tablespoon' },
      { name: 'Lime Juice', category: 'pantry', aliases: ['fresh lime juice'], defaultUnit: 'tablespoon' },
      { name: 'Hoisin Sauce', category: 'pantry', aliases: ['hoisin'], defaultUnit: 'tablespoon' },
      { name: 'Buffalo Sauce', category: 'pantry', aliases: ['buffalo wing sauce', "frank's red hot"], defaultUnit: 'cup' },
      { name: 'Tabasco Sauce', category: 'pantry', aliases: ['tabasco'], defaultUnit: 'teaspoon' },
      { name: 'Sweet Chili Sauce', category: 'pantry', aliases: ['sweet chili', 'thai sweet chili sauce'], defaultUnit: 'tablespoon' },
      { name: 'Red Curry Paste', category: 'pantry', aliases: ['thai red curry paste', 'curry paste'], defaultUnit: 'tablespoon' },
      { name: 'Coconut Aminos', category: 'pantry', aliases: ['coconut aminos or tamari', 'tamari sauce'], defaultUnit: 'tablespoon' },
      { name: 'Maggi Sauce', category: 'pantry', aliases: ['maggi seasoning', 'maggi'], defaultUnit: 'tablespoon' },
      { name: 'Food Coloring', category: 'pantry', aliases: ['soft pink food coloring', 'red food coloring', 'gel food coloring'], defaultUnit: 'drop' },
      { name: 'Yellow Mustard', category: 'pantry', aliases: ['regular mustard', 'prepared mustard'], defaultUnit: 'tablespoon' },
      { name: 'Cooking Spray', category: 'pantry', aliases: ['non-stick cooking spray', 'pam', 'vegetable spray'], defaultUnit: 'piece' },
      { name: 'Neutral Oil', category: 'pantry', aliases: ['vegetable oil', 'canola oil', 'light flavored oil', 'peanut oil'], defaultUnit: 'tablespoon' },
      { name: 'Red Wine', category: 'pantry', aliases: ['dry red wine', 'cooking wine'], defaultUnit: 'cup' },
      { name: 'White Wine', category: 'pantry', aliases: ['dry white wine', 'cooking white wine'], defaultUnit: 'cup' },
      { name: 'Marsala Wine', category: 'pantry', aliases: ['sweet marsala wine', 'marsala'], defaultUnit: 'cup' },
      { name: 'Refried Beans', category: 'pantry', aliases: ['canned refried beans', 'full-fat refried beans'], defaultUnit: 'can' },
      { name: 'Enchilada Sauce', category: 'pantry', aliases: ['green enchilada sauce', 'red enchilada sauce', 'green chile enchilada sauce'], defaultUnit: 'can' },
      { name: 'Sofrito', category: 'pantry', aliases: ['recaito'], defaultUnit: 'tablespoon' },
      { name: 'Beef Bouillon', category: 'pantry', aliases: ['beef bullion cube', 'beef stock concentrate', 'bouillon cube'], defaultUnit: 'piece' },
      { name: 'Ice', category: 'pantry', aliases: ['ice cubes', 'crushed ice'], defaultUnit: 'cup' },
      { name: 'Gelatin', category: 'pantry', aliases: ['unflavored gelatin', 'knox gelatin'], defaultUnit: 'packet' },

      // Grains & Pasta
      { name: 'Rice', category: 'grains', aliases: ['white rice', 'long grain rice', 'jasmine rice'], defaultUnit: 'cup' },
      { name: 'Brown Rice', category: 'grains', aliases: ['whole grain rice'], defaultUnit: 'cup' },
      { name: 'Rice Noodles', category: 'grains', aliases: ['rice noodle', 'wide rice noodles', 'pad thai noodles'], defaultUnit: 'oz' },
      { name: 'Pasta', category: 'grains', aliases: ['spaghetti', 'penne', 'linguine', 'fettuccine', 'elbow macaroni'], defaultUnit: 'oz' },
      { name: 'Noodles', category: 'grains', aliases: ['egg noodles', 'lo mein noodles', 'ramen noodles'], defaultUnit: 'oz' },
      { name: 'Bread', category: 'grains', aliases: ['white bread', 'sandwich bread'], defaultUnit: 'slice' },
      { name: 'Flour', category: 'grains', aliases: ['all-purpose flour', 'ap flour', 'plain flour'], defaultUnit: 'cup' },
      { name: 'Bread Crumbs', category: 'grains', aliases: ['breadcrumbs', 'panko'], defaultUnit: 'cup' },
      { name: 'Oats', category: 'grains', aliases: ['rolled oats', 'oatmeal'], defaultUnit: 'cup' },
      { name: 'Quinoa', category: 'grains', aliases: [], defaultUnit: 'cup' },
      { name: 'Tortilla', category: 'grains', aliases: ['tortillas', 'corn tortilla'], defaultUnit: 'piece' },
      { name: 'Flour Tortillas', category: 'grains', aliases: ['flour tortilla', 'soft tortillas'], defaultUnit: 'piece' },
      { name: 'Pie Crust', category: 'grains', aliases: ['pie shell', 'pastry crust', '9-inch pie crust'], defaultUnit: 'piece' },

      // Baking
      { name: 'Granulated Sugar', category: 'baking', aliases: ['sugar', 'white sugar', 'table sugar', 'caster sugar'], defaultUnit: 'cup' },
      { name: 'Coconut Sugar', category: 'baking', aliases: ['coconut palm sugar'], defaultUnit: 'cup' },
      { name: 'Brown Sugar', category: 'baking', aliases: ['light brown sugar', 'dark brown sugar'], defaultUnit: 'cup' },
      { name: 'Powdered Sugar', category: 'baking', aliases: ['confectioners sugar', 'icing sugar'], defaultUnit: 'cup' },
      { name: 'Baking Powder', category: 'baking', aliases: [], defaultUnit: 'teaspoon' },
      { name: 'Baking Soda', category: 'baking', aliases: ['bicarbonate of soda'], defaultUnit: 'teaspoon' },
      { name: 'Cream of Tartar', category: 'baking', aliases: ['tartar'], defaultUnit: 'teaspoon' },
      { name: 'Cornstarch', category: 'baking', aliases: ['corn starch', 'cornflour'], defaultUnit: 'tablespoon' },
      { name: 'Vanilla Extract', category: 'baking', aliases: ['vanilla', 'pure vanilla'], defaultUnit: 'teaspoon' },
      { name: 'Cocoa Powder', category: 'baking', aliases: ['unsweetened cocoa'], defaultUnit: 'cup' },
      { name: 'Chocolate Chips', category: 'baking', aliases: ['semi-sweet chocolate chips'], defaultUnit: 'cup' },
      { name: 'Yeast', category: 'baking', aliases: ['active dry yeast', 'instant yeast'], defaultUnit: 'packet' },

      // Spices
      { name: 'Salt', category: 'spices', aliases: ['table salt', 'sea salt', 'kosher salt', 'garlic salt'], defaultUnit: 'teaspoon' },
      { name: 'Black Pepper', category: 'spices', aliases: ['pepper', 'ground black pepper', 'black peppercorns'], defaultUnit: 'teaspoon' },
      { name: 'Paprika', category: 'spices', aliases: ['sweet paprika', 'smoked paprika', 'hungarian paprika'], defaultUnit: 'teaspoon' },
      { name: 'Cumin', category: 'spices', aliases: ['ground cumin'], defaultUnit: 'teaspoon' },
      { name: 'Chili Powder', category: 'spices', aliases: ['chile powder', 'ancho chili powder'], defaultUnit: 'teaspoon' },
      { name: 'Oregano', category: 'spices', aliases: ['dried oregano'], defaultUnit: 'teaspoon' },
      { name: 'Basil', category: 'spices', aliases: ['dried basil', 'fresh basil'], defaultUnit: 'teaspoon' },
      { name: 'Thyme', category: 'spices', aliases: ['dried thyme', 'fresh thyme'], defaultUnit: 'teaspoon' },
      { name: 'Rosemary', category: 'spices', aliases: ['dried rosemary', 'fresh rosemary'], defaultUnit: 'teaspoon' },
      { name: 'Sage', category: 'spices', aliases: ['dried sage', 'fresh sage', 'sage leaves'], defaultUnit: 'teaspoon' },
      { name: 'Cinnamon', category: 'spices', aliases: ['ground cinnamon'], defaultUnit: 'teaspoon' },
      { name: 'Nutmeg', category: 'spices', aliases: ['ground nutmeg'], defaultUnit: 'teaspoon' },
      { name: 'Cloves', category: 'spices', aliases: ['whole cloves', 'ground cloves'], defaultUnit: 'piece' },
      { name: 'Allspice', category: 'spices', aliases: ['ground allspice', 'jamaican allspice', 'whole allspice'], defaultUnit: 'teaspoon' },
      { name: 'White Pepper', category: 'spices', aliases: ['ground white pepper', 'white peppercorns'], defaultUnit: 'teaspoon' },
      { name: 'Fennel Seed', category: 'spices', aliases: ['fennel seeds', 'ground fennel', 'ground fennel seeds'], defaultUnit: 'teaspoon' },
      { name: 'Coriander', category: 'spices', aliases: ['ground coriander', 'coriander seed', 'coriander seeds'], defaultUnit: 'teaspoon' },
      { name: 'Fenugreek', category: 'spices', aliases: ['fenugreek leaves', 'dried fenugreek leaves', 'methi'], defaultUnit: 'teaspoon' },
      { name: 'Adobo Seasoning', category: 'spices', aliases: ['adobo', 'goya adobo'], defaultUnit: 'teaspoon' },
      { name: 'Achiote', category: 'spices', aliases: ['achiote powder', 'annatto', 'anatto paste', 'achiote paste'], defaultUnit: 'tablespoon' },
      { name: 'Sazon', category: 'spices', aliases: ['sazon goya', 'sazon seasoning', 'sazon goya con culantro y achiote'], defaultUnit: 'packet' },
      { name: 'MSG', category: 'spices', aliases: ['monosodium glutamate', 'accent seasoning'], defaultUnit: 'teaspoon' },
      { name: 'Gumbo File', category: 'spices', aliases: ['gumbo filé', 'file powder', 'sassafras'], defaultUnit: 'teaspoon' },
      { name: 'Ancho Chile Powder', category: 'spices', aliases: ['ancho chili powder', 'ancho powder'], defaultUnit: 'teaspoon' },
      { name: 'Dried Chili Flakes', category: 'spices', aliases: ['dried red chili flakes', 'chili flakes'], defaultUnit: 'teaspoon' },
      { name: 'Cayenne', category: 'spices', aliases: ['cayenne pepper', 'ground cayenne'], defaultUnit: 'teaspoon' },
      { name: 'Garlic Powder', category: 'spices', aliases: ['granulated garlic'], defaultUnit: 'teaspoon' },
      { name: 'Onion Powder', category: 'spices', aliases: [], defaultUnit: 'teaspoon' },
      { name: 'Italian Seasoning', category: 'spices', aliases: ['italian herbs', 'italian blend seasoning', 'italian blend'], defaultUnit: 'teaspoon' },
      { name: 'Mixed Herbs', category: 'spices', aliases: ['herbs', 'dried herbs', 'herb blend'], defaultUnit: 'teaspoon' },
      { name: 'Bay Leaf', category: 'spices', aliases: ['bay leaves'], defaultUnit: 'piece' },
      { name: 'Red Pepper Flakes', category: 'spices', aliases: ['crushed red pepper', 'chili flakes', 'dried chili flakes', 'red chili flakes', 'dried red chili flakes'], defaultUnit: 'teaspoon' },
      { name: 'Curry Powder', category: 'spices', aliases: ['curry'], defaultUnit: 'teaspoon' },
      { name: 'Garam Masala', category: 'spices', aliases: [], defaultUnit: 'teaspoon' },
      { name: 'Turmeric', category: 'spices', aliases: ['ground turmeric'], defaultUnit: 'teaspoon' },
      { name: 'Cilantro', category: 'spices', aliases: ['fresh cilantro', 'coriander leaves'], defaultUnit: 'cup' },
      { name: 'Parsley', category: 'spices', aliases: ['fresh parsley', 'flat leaf parsley', 'flat parsley'], defaultUnit: 'cup' },
      { name: 'Dill', category: 'spices', aliases: ['fresh dill', 'dill weed'], defaultUnit: 'tablespoon' },
      { name: 'Mint', category: 'spices', aliases: ['fresh mint', 'mint leaves'], defaultUnit: 'cup' },
      
      // Seasoning Mixes
      { name: 'Cajun Seasoning', category: 'spices', aliases: ['cajun spice', 'creole seasoning'], defaultUnit: 'teaspoon' },
      { name: 'Taco Seasoning', category: 'spices', aliases: ['taco spice mix', 'taco seasoning mix'], defaultUnit: 'packet' },
      { name: 'Ranch Dressing Mix', category: 'spices', aliases: ['ranch seasoning', 'ranch mix', 'ranch packet'], defaultUnit: 'packet' },
      { name: 'Au Jus Gravy Mix', category: 'spices', aliases: ['au jus mix', 'beef gravy mix'], defaultUnit: 'packet' },
      { name: 'Onion Soup Mix', category: 'spices', aliases: ['onion soup packet', 'lipton onion soup mix'], defaultUnit: 'packet' },
      { name: 'Herbes de Provence', category: 'spices', aliases: ['herbs de provence', 'provence herbs'], defaultUnit: 'teaspoon' },
      { name: 'Jerk Seasoning', category: 'spices', aliases: ['jamaican jerk', 'jerk spice'], defaultUnit: 'tablespoon' },
      { name: 'Sweet Rub', category: 'spices', aliases: ['bbq rub', 'dry rub', 'rub'], defaultUnit: 'tablespoon' },
    ];

    this.logger.log(`Seeding/updating ${ingredients.length} ingredients...`);

    let added = 0;
    let updated = 0;

    for (const ing of ingredients) {
      const existing = await this.ingredientRepo.findOne({ where: { name: ing.name } });
      if (!existing) {
        await this.ingredientRepo.save(this.ingredientRepo.create(ing));
        added++;
      } else {
        // Update aliases if they've changed
        const existingAliases = existing.aliases || [];
        const newAliases = ing.aliases || [];
        const mergedAliases = [...new Set([...existingAliases, ...newAliases])];
        
        if (mergedAliases.length > existingAliases.length) {
          existing.aliases = mergedAliases;
          await this.ingredientRepo.save(existing);
          updated++;
        }
      }
    }

    this.logger.log(`Ingredients seeded: ${added} added, ${updated} updated with new aliases`);
  }

  private async seedUnits() {
    const units: UnitSeed[] = [
      // Volume - metric base: ml
      { name: 'milliliter', abbreviation: 'ml', aliases: ['milliliters', 'mL'], type: 'volume', baseUnit: 'ml', conversionToBase: 1 },
      { name: 'liter', abbreviation: 'L', aliases: ['liters', 'litre', 'litres'], type: 'volume', baseUnit: 'ml', conversionToBase: 1000 },
      { name: 'teaspoon', abbreviation: 'tsp', aliases: ['teaspoons', 't', 'tsps'], type: 'volume', baseUnit: 'ml', conversionToBase: 4.929 },
      { name: 'tablespoon', abbreviation: 'tbsp', aliases: ['tablespoons', 'T', 'tbsps', 'tbl'], type: 'volume', baseUnit: 'ml', conversionToBase: 14.787 },
      { name: 'cup', abbreviation: 'c', aliases: ['cups', 'C'], type: 'volume', baseUnit: 'ml', conversionToBase: 236.588 },
      { name: 'fluid ounce', abbreviation: 'fl oz', aliases: ['fluid ounces', 'fl. oz.'], type: 'volume', baseUnit: 'ml', conversionToBase: 29.574 },
      { name: 'pint', abbreviation: 'pt', aliases: ['pints'], type: 'volume', baseUnit: 'ml', conversionToBase: 473.176 },
      { name: 'quart', abbreviation: 'qt', aliases: ['quarts'], type: 'volume', baseUnit: 'ml', conversionToBase: 946.353 },
      { name: 'gallon', abbreviation: 'gal', aliases: ['gallons'], type: 'volume', baseUnit: 'ml', conversionToBase: 3785.41 },

      // Weight - metric base: g
      { name: 'gram', abbreviation: 'g', aliases: ['grams', 'gm'], type: 'weight', baseUnit: 'g', conversionToBase: 1 },
      { name: 'kilogram', abbreviation: 'kg', aliases: ['kilograms', 'kilo'], type: 'weight', baseUnit: 'g', conversionToBase: 1000 },
      { name: 'milligram', abbreviation: 'mg', aliases: ['milligrams'], type: 'weight', baseUnit: 'g', conversionToBase: 0.001 },
      { name: 'ounce', abbreviation: 'oz', aliases: ['ounces'], type: 'weight', baseUnit: 'g', conversionToBase: 28.3495 },
      { name: 'pound', abbreviation: 'lb', aliases: ['pounds', 'lbs'], type: 'weight', baseUnit: 'g', conversionToBase: 453.592 },

      // Count
      { name: 'piece', abbreviation: 'pc', aliases: ['pieces', 'pcs', 'whole', 'item', 'items'], type: 'count' },
      { name: 'slice', aliases: ['slices'], type: 'count' },
      { name: 'clove', aliases: ['cloves'], type: 'count' },
      { name: 'sprig', aliases: ['sprigs'], type: 'count' },
      { name: 'bunch', aliases: ['bunches'], type: 'count' },
      { name: 'head', aliases: ['heads'], type: 'count' },
      { name: 'stalk', aliases: ['stalks'], type: 'count' },
      { name: 'can', aliases: ['cans', 'tin', 'tins'], type: 'count' },
      { name: 'package', abbreviation: 'pkg', aliases: ['packages', 'pack', 'packs', 'packet', 'packets'], type: 'count' },
      { name: 'jar', aliases: ['jars'], type: 'count' },
      { name: 'bottle', aliases: ['bottles'], type: 'count' },
      { name: 'bag', aliases: ['bags'], type: 'count' },
      { name: 'box', aliases: ['boxes'], type: 'count' },
      { name: 'stick', aliases: ['sticks'], type: 'count' },
      { name: 'sheet', aliases: ['sheets'], type: 'count' },
      { name: 'leaf', aliases: ['leaves'], type: 'count' },
      { name: 'strip', aliases: ['strips'], type: 'count' },
      { name: 'fillet', aliases: ['fillets', 'filet', 'filets'], type: 'count' },
      { name: 'breast', aliases: ['breasts'], type: 'count' },
      { name: 'thigh', aliases: ['thighs'], type: 'count' },
      { name: 'leg', aliases: ['legs'], type: 'count' },
      { name: 'wing', aliases: ['wings'], type: 'count' },
      { name: 'rib', aliases: ['ribs'], type: 'count' },
      { name: 'ear', aliases: ['ears'], type: 'count' }, // for corn
      { name: 'drop', aliases: ['drops'], type: 'count' },
      { name: 'dash', aliases: ['dashes'], type: 'count' },
      { name: 'pinch', aliases: ['pinches'], type: 'count' },
      { name: 'handful', aliases: ['handfuls'], type: 'count' },

      // Length
      { name: 'inch', abbreviation: 'in', aliases: ['inches', '"'], type: 'length' },
      { name: 'centimeter', abbreviation: 'cm', aliases: ['centimeters'], type: 'length' },
    ];

    this.logger.log(`Seeding ${units.length} units...`);

    for (const unit of units) {
      const existing = await this.unitRepo.findOne({ where: { name: unit.name } });
      if (!existing) {
        await this.unitRepo.save(this.unitRepo.create(unit));
      }
    }

    this.logger.log('Units seeded successfully');
  }

  private async seedModifiers() {
    const modifiers: ModifierSeed[] = [
      // Preparation
      { name: 'chopped', type: 'preparation', aliases: ['chop'] },
      { name: 'diced', type: 'preparation', aliases: ['dice', 'cubed'] },
      { name: 'minced', type: 'preparation', aliases: ['mince', 'finely chopped'] },
      { name: 'sliced', type: 'preparation', aliases: ['slice'] },
      { name: 'julienned', type: 'preparation', aliases: ['julienne', 'matchstick'] },
      { name: 'grated', type: 'preparation', aliases: ['shredded', 'shred'] },
      { name: 'mashed', type: 'preparation', aliases: ['mash'] },
      { name: 'crushed', type: 'preparation', aliases: ['crush'] },
      { name: 'halved', type: 'preparation', aliases: ['halve', 'cut in half'] },
      { name: 'quartered', type: 'preparation', aliases: ['quarter'] },
      { name: 'cubed', type: 'preparation', aliases: ['cube', 'cut into cubes'] },
      { name: 'peeled', type: 'preparation', aliases: ['peel'] },
      { name: 'seeded', type: 'preparation', aliases: ['seed', 'deseeded'] },
      { name: 'cored', type: 'preparation', aliases: ['core'] },
      { name: 'trimmed', type: 'preparation', aliases: ['trim'] },
      { name: 'zested', type: 'preparation', aliases: ['zest'] },
      { name: 'juiced', type: 'preparation', aliases: ['juice'] },
      { name: 'beaten', type: 'preparation', aliases: ['beat', 'whisked'] },
      { name: 'sifted', type: 'preparation', aliases: ['sift'] },
      { name: 'packed', type: 'preparation', aliases: ['firmly packed'] },

      // State
      { name: 'fresh', type: 'state', aliases: [] },
      { name: 'frozen', type: 'state', aliases: ['freeze'] },
      { name: 'dried', type: 'state', aliases: ['dry', 'dehydrated'] },
      { name: 'canned', type: 'state', aliases: ['tinned'] },
      { name: 'jarred', type: 'state', aliases: [] },
      { name: 'thawed', type: 'state', aliases: ['defrosted'] },
      { name: 'room temperature', type: 'state', aliases: ['at room temperature', 'room temp'] },
      { name: 'chilled', type: 'state', aliases: ['cold', 'refrigerated'] },
      { name: 'softened', type: 'state', aliases: ['soft'] },
      { name: 'melted', type: 'state', aliases: ['melt'] },
      { name: 'warm', type: 'state', aliases: ['warmed', 'lukewarm'] },
      { name: 'hot', type: 'state', aliases: ['heated'] },

      // Quality
      { name: 'boneless', type: 'quality', aliases: ['bone-free'] },
      { name: 'skinless', type: 'quality', aliases: ['skin-free'] },
      { name: 'bone-in', type: 'quality', aliases: ['with bone'] },
      { name: 'skin-on', type: 'quality', aliases: ['with skin'] },
      { name: 'lean', type: 'quality', aliases: [] },
      { name: 'fat-free', type: 'quality', aliases: ['non-fat', 'nonfat'] },
      { name: 'low-fat', type: 'quality', aliases: ['reduced fat'] },
      { name: 'whole', type: 'quality', aliases: ['whole grain', 'whole wheat'] },
      { name: 'organic', type: 'quality', aliases: [] },
      { name: 'unsalted', type: 'quality', aliases: ['salt-free'] },
      { name: 'salted', type: 'quality', aliases: ['with salt'] },
      { name: 'unsweetened', type: 'quality', aliases: ['no sugar added'] },
      { name: 'sweetened', type: 'quality', aliases: [] },
      { name: 'ripe', type: 'quality', aliases: ['ripened'] },
      { name: 'unripe', type: 'quality', aliases: ['green'] },
      { name: 'seedless', type: 'quality', aliases: [] },
      { name: 'pitted', type: 'quality', aliases: [] },
      { name: 'extra-virgin', type: 'quality', aliases: ['extra virgin'] },

      // Size
      { name: 'large', type: 'size', aliases: ['lg'] },
      { name: 'medium', type: 'size', aliases: ['med'] },
      { name: 'small', type: 'size', aliases: ['sm'] },
      { name: 'extra-large', type: 'size', aliases: ['xl', 'jumbo'] },
      { name: 'thick', type: 'size', aliases: ['thickly'] },
      { name: 'thin', type: 'size', aliases: ['thinly'] },
      { name: 'bite-sized', type: 'size', aliases: ['bite-size', 'bite size'] },

      // Cooking
      { name: 'cooked', type: 'cooking', aliases: ['cook'] },
      { name: 'raw', type: 'cooking', aliases: ['uncooked'] },
      { name: 'roasted', type: 'cooking', aliases: ['roast'] },
      { name: 'toasted', type: 'cooking', aliases: ['toast'] },
      { name: 'fried', type: 'cooking', aliases: ['fry', 'pan-fried'] },
      { name: 'grilled', type: 'cooking', aliases: ['grill', 'charred'] },
      { name: 'baked', type: 'cooking', aliases: ['bake'] },
      { name: 'steamed', type: 'cooking', aliases: ['steam'] },
      { name: 'boiled', type: 'cooking', aliases: ['boil'] },
      { name: 'blanched', type: 'cooking', aliases: ['blanch'] },
      { name: 'poached', type: 'cooking', aliases: ['poach'] },
      { name: 'sautéed', type: 'cooking', aliases: ['saute', 'sauteed'] },
      { name: 'braised', type: 'cooking', aliases: ['braise'] },
      { name: 'smoked', type: 'cooking', aliases: ['smoke'] },
      { name: 'caramelized', type: 'cooking', aliases: ['caramelize'] },
      { name: 'browned', type: 'cooking', aliases: ['brown'] },
    ];

    this.logger.log(`Seeding ${modifiers.length} modifiers...`);

    for (const mod of modifiers) {
      const existing = await this.modifierRepo.findOne({ where: { name: mod.name } });
      if (!existing) {
        await this.modifierRepo.save(this.modifierRepo.create(mod));
      }
    }

    this.logger.log('Modifiers seeded successfully');
  }
}

