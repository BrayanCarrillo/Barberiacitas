/**
 * Formats a number as Colombian Pesos (COP).
 * @param amount The number to format.
 * @returns The formatted currency string (e.g., "COP 10,000").
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) {
    return 'COP 0'; // Or handle error as needed
  }
  // Use Intl.NumberFormat for locale-aware formatting without decimals
  // and explicitly state the currency.
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
