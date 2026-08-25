export function formatCurrency(usd?: number): string {
  if (usd === undefined || usd === null) return '₹0 Cr';
  // Roughly converting USD to INR for the demo context (assuming $1 = ₹83, 1 Cr = 10,000,000)
  // Or just display the USD value formatted. The spec says "(formatted as ₹ Cr)".
  // Let's assume the revenue_usd is actually USD and we just roughly convert to ₹ Cr.
  const inr = usd * 83; 
  const cr = inr / 10000000;
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(cr) + ' Cr';
}

export function formatPercentage(decimal: number): string {
  return `${Math.round(decimal * 100)}%`;
}
