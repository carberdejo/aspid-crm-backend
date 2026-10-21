import { BillingStatus } from './interfaces/billing-status.enum';

/** Pasa un monto decimal a céntimos para comparar sin errores de coma flotante */
export const toCents = (amount: number | string) =>
  Math.round(Number(amount) * 100);

/** Estado de facturación de una OC según lo facturado (solo facturas vigentes) */
export function computeBillingStatus(
  orderAmount: number | string,
  invoicedAmount: number | string,
): BillingStatus {
  const invoiced = toCents(invoicedAmount);
  if (invoiced <= 0) return BillingStatus.PENDIENTE_FACTURACION;
  return invoiced >= toCents(orderAmount)
    ? BillingStatus.FACTURADO_COMPLETO
    : BillingStatus.FACTURADO_PARCIAL;
}
