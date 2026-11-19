/** Sort choices for the shop grid (shared by the server query and the sort menu). */
export const SORT_OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];
