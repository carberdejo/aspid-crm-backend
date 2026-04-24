export interface Telefono {
  numero: string;
}

export interface ActividadEconomica {
  codigo: string;
  descripcion: string;
  principal?: boolean;
}

export interface ComprobantePago {
  codigo: string;
  descripcion: string;
  fechaInicio?: string;
}

export interface SistemaElectronico {
  codigo: string;
  descripcion: string;
  fechaInicio?: string;
}

export interface ComprobanteElectronico {
  codigo: string;
  descripcion: string;
  fechaInicio?: string;
}

export interface Padron {
  codigo: string;
  descripcion: string;
}

export interface RucResponse {
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  telefonos: Telefono[];
  tipo: string | null;
  estado: string;
  condicion: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  fechaInscripcion: string | null;
  sistEmsion: string | null;
  sistContabilidad: string | null;
  actExterior: string | null;
  actEconomicas: ActividadEconomica[];
  cpPago: ComprobantePago[];
  sistElectronica: SistemaElectronico[];
  fechaEmisorFe: string | null;
  cpeElectronico: ComprobanteElectronico[];
  fechaPle: string | null;
  padrones: Padron[];
  fechaBaja: string | null;
  profesion: string | null;
  ubigeo: string;
  capital: string;
}
