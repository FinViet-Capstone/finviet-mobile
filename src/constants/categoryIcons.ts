import {
  Utensils,
  Car,
  ShoppingBag,
  HeartPulse,
  BookOpen,
  Home,
  Gamepad2,
  Sparkles,
  Receipt,
  Users,
  PiggyBank,
  Banknote,
  Ellipsis,
  type LucideIcon,
} from 'lucide-react-native';

// Maps the icon slug stored on each Category (see constants/categories.ts)
// to the corresponding Lucide React Native icon component.
const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  'book-open': BookOpen,
  home: Home,
  'gamepad-2': Gamepad2,
  sparkles: Sparkles,
  receipt: Receipt,
  users: Users,
  'piggy-bank': PiggyBank,
  banknote: Banknote,
  ellipsis: Ellipsis,
};

export function getCategoryIcon(slug: string | undefined): LucideIcon {
  if (!slug) return Ellipsis;
  return ICON_MAP[slug] ?? Ellipsis;
}
