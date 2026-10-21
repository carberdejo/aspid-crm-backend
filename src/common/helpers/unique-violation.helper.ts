import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';

/**
 * Si el error es una violación de unicidad de Postgres, devuelve el nombre de la
 * restricción o índice violado; si no, undefined.
 *
 * Sirve para traducir a un error de negocio la carrera que una validación previa no
 * puede evitar (dos peticiones simultáneas con el mismo número).
 */
export function uniqueViolationConstraint(error: unknown): string | undefined {
  if (!(error instanceof QueryFailedError)) return undefined;
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return driverError?.code === PG_UNIQUE_VIOLATION
    ? driverError.constraint
    : undefined;
}
