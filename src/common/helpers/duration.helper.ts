/**
 * Convierte un string de duración (ej: '7d', '15m', '1h') a milisegundos
 * @param duration String con formato: número + unidad (s, m, h, d)
 * @returns Número de milisegundos
 * @throws Error si el formato no es válido
 */
export function parseDurationToMs(duration: string): number {
  const trimmedDuration = duration.trim();
  const match = trimmedDuration.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(
      `Invalid duration format: "${duration}". Expected format: number + unit (s, m, h, d). Example: "7d", "15m"`,
    );
  }

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  const unitMap: Record<string, number> = {
    s: 1000, // segundos
    m: 1000 * 60, // minutos
    h: 1000 * 60 * 60, // horas
    d: 1000 * 60 * 60 * 24, // días
  };

  const multiplier = unitMap[unit];
  if (!multiplier) {
    throw new Error(`Unknown time unit: "${unit}"`);
  }

  return num * multiplier;
}
