# Configuración de Nginx con tu API NestJS

## Contexto

Tu helper `extractClientIp()` ya está preparado para extraer la IP real del cliente cuando el tráfico pasa a través de Nginx. Sin embargo, **es crítico que Nginx esté configurado para pasar los headers correctos**.

## Configuración mínima de Nginx

```nginx
upstream nestjs_app {
    server 127.0.0.1:4000;  # Puerto donde corre tu app NestJS
}

server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://nestjs_app;

        # Headers que Nginx DEBE pasar para que extractClientIp() funcione
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Opcional: si usas WebSockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## ¿Qué hace cada header?

- **`X-Real-IP`**: La IP original del cliente
- **`X-Forwarded-For`**: Lista de IPs del cliente y proxies intermedios
- **`X-Forwarded-Proto`**: El protocolo original (http/https)
- **`Host`**: El host original del request

## Orden de búsqueda en tu código

Tu helper intenta extraer la IP en este orden:

1. ✅ `X-Forwarded-For` (primera IP de la lista)
2. ✅ `X-Real-IP` (usado por algunos proxies)
3. ✅ `CF-Connecting-IP` (si usas Cloudflare)
4. ✅ `req.ip` (fallback de Express, normalizado)

## Caso con Nginx

**Antes (sin Nginx, desarrollo local):**

```
Cliente → API NestJS (req.ip = ::1 normalizado → 127.0.0.1) ✓
```

**Con Nginx:**

```
Cliente (123.45.67.89) → Nginx → API NestJS
```

Si Nginx **está bien configurado** con los headers:

```
Nginx pasa X-Real-IP: 123.45.67.89
Tu helper lo extrae → Se guarda 123.45.67.89 en BD ✓
```

Si Nginx **NO está configurado** con los headers:

```
Nginx no pasa headers
Tu helper cae en req.ip → Obtiene 127.0.0.1 (IP del proxy) ✗
```

## Verificación

Para verificar que Nginx está pasando los headers correctamente:

1. En development, agrega logging temporal en `auth.service.ts`:

```typescript
const ipAddress = extractClientIp(req);
this.logger.log(`Raw req.ip: ${req.ip}`);
this.logger.log(`X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
this.logger.log(`X-Real-IP: ${req.headers['x-real-ip']}`);
this.logger.log(`Extracted IP: ${ipAddress}`);
```

2. Luego en logs verás exactamente qué headers está pasando Nginx.

## Conclusión

Tu código está listo para Nginx. Cuando lo despliegues:

- **Solo asegúrate de usar la configuración de Nginx anterior**
- No necesitas cambiar código
- Todo seguirá normal ✓

Si algo falla, es porque Nginx no está pasando los headers, no porque tu código sea deficiente.
