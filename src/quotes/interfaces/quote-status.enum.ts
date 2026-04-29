export enum QuoteStatus {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO', // Se convierte en Orden de Compra
  RECHAZADO = 'RECHAZADO', // Estado tras el "Soft Delete"
}
