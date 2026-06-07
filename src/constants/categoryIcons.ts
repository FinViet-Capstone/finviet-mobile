// Maps the icon slug stored on each Category to Material Symbols icon names
const ICON_MAP: Record<string, string> = {
  utensils: 'restaurant',
  car: 'directions_car',
  'shopping-bag': 'shopping_bag',
  'heart-pulse': 'monitor_heart',
  'book-open': 'menu_book',
  home: 'home',
  'gamepad-2': 'sports_esports',
  sparkles: 'auto_awesome',
  receipt: 'receipt',
  users: 'group',
  'piggy-bank': 'savings',
  banknote: 'payments',
  ellipsis: 'more_horiz',

  // Additional common categories
  coffee: 'local_cafe',
  plane: 'flight',
  bus: 'directions_bus',
  train: 'train',
  phone: 'phone',
  wifi: 'wifi',
  zap: 'bolt',
  droplet: 'water_drop',
  flame: 'local_fire_department',
  briefcase: 'work',
  'graduation-cap': 'school',
  pet: 'pets',
  tree: 'park',
  music: 'music_note',
  film: 'movie',
  dumbbell: 'fitness_center',
  pill: 'medication',
  shirt: 'checkroom',
  gift: 'card_giftcard',
  heart: 'favorite',
};

/**
 * Returns the Material Symbols icon name for a given category slug
 * @param slug - The category icon slug (e.g., 'utensils', 'car')
 * @returns Material Symbols icon name (e.g., 'restaurant', 'directions_car')
 */
export function getCategoryIcon(slug: string | undefined): string {
  if (!slug) return 'more_horiz';
  return ICON_MAP[slug] ?? 'more_horiz';
}

/**
 * Returns all available category icon mappings
 */
export function getAllCategoryIcons(): Record<string, string> {
  return ICON_MAP;
}
