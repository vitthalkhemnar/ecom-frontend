export const CATEGORY_ICONS: Record<string, string> = {
  'Beauty & Personal Care': '💄',
  'Books': '📚',
  'Home & Kitchen': '🏠',
  'Clothing': '👕',
  'Sports & Fitness': '🏋️',
  'Electronics': '🎧',
};

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? '🛍️';
}