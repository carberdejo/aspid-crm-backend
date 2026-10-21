/**
 * Vigencia de una orden de compra o factura. Es independiente del estado de
 * facturación (BillingStatus): una OC anulada no se borra, deja de contar.
 */
export enum DocumentStatus {
  VIGENTE = 'VIGENTE',
  ANULADA = 'ANULADA',
}
