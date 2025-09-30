
export const VALID_EXPENSE_CATEGORIES = [
  "alimentação",
  "transporte", 
  "saúde",
  "educação",
  "lazer",
  "moradia",
  "vestuário",
  "serviços",
  "combustível",
  "farmácia",
  "supermercado",
  "restaurante",
  "outros"
] as const;

export type ValidExpenseCategory = typeof VALID_EXPENSE_CATEGORIES[number];

export function isValidExpenseCategory(category: string): category is ValidExpenseCategory {
  return VALID_EXPENSE_CATEGORIES.includes(category.toLowerCase() as ValidExpenseCategory);
}

export function normalizeExpenseCategory(category: string): ValidExpenseCategory {
  const normalized = category.toLowerCase().trim();
  
  if (!isValidExpenseCategory(normalized)) {
    throw new Error(`Categoria inválida: "${category}". Categorias válidas: ${VALID_EXPENSE_CATEGORIES.join(", ")}`);
  }
  
  return normalized as ValidExpenseCategory;
}

export function getValidExpenseCategories(): readonly string[] {
  return VALID_EXPENSE_CATEGORIES;
}
