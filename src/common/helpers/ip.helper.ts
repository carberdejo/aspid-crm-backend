import { Request } from 'express';

/**
 * Extrae la IP real desde los headers del request, considerando proxies y localhost
 * @param req Request de Express
 * @returns IP como string
 */
export function extractClientIp(req: Request): string {
  // 1. Intentar extraer desde x-forwarded-for (puede ser una lista separada por comas)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const firstIp = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor.split(',')[0];
    return firstIp.trim();
  }

  // 2. Intentar x-real-ip (usado por algunos proxies como Nginx)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    const ip = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    return typeof ip === 'string' ? ip.trim() : ip;
  }

  // 3. Intentar cf-connecting-ip (Cloudflare)
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }

  // 4. Usar req.ip como fallback, pero normalizarlo
  let ip = req.ip || '0.0.0.0';

  // Normalizar IPv6 localhost (::1) a IPv4 (127.0.0.1)
  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  // Remover prefijo IPv6 si existe (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return ip;
}
