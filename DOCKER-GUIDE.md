# Docker Setup - CONCAR Backend

Guía completa para usar Docker y Docker Compose con el proyecto CONCAR Backend (NestJS).

## 📋 Requisitos Previos

- **Docker**: v20.10+
- **Docker Compose**: v3.9+
- **Git**: Para clonar el repositorio

### Verificar instalación:
```bash
docker --version
docker-compose --version
```

---

## 🚀 Inicio Rápido

### 1. Clonar el Repositorio
```bash
git clone <tu-repositorio>
cd concar-backend
```

### 2. Configurar Variables de Entorno
```bash
# Opción A: Copiar el archivo de referencia
cp .env.docker .env

# Opción B: Crear archivo .env personalizado (recomendado para producción)
# Edita .env con tus valores específicos
```

### 3. Iniciar los Servicios
```bash
# Iniciar en modo background
docker-compose up -d

# Iniciar en modo foreground (ver logs en tiempo real)
docker-compose up

# Reconstruir imágenes (si hay cambios en el código)
docker-compose up -d --build
```

### 4. Verificar que Todo Funciona
```bash
# Ver estado de los servicios
docker-compose ps

# Ver logs del backend
docker-compose logs backend

# Ver logs de la base de datos
docker-compose logs postgres
```

---

## 🌐 Acceso a los Servicios

Una vez que los contenedores estén ejecutándose:

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **API Backend** | http://localhost:5000 | NestJS API |
| **Swagger Docs** | http://localhost:5000/api/docs | Documentación interactiva |
| **PostgreSQL** | localhost:5432 | Base de datos |
| **PgAdmin** | http://localhost:5050 | Gestor gráfico de BD |

### Credenciales por defecto:

**PostgreSQL:**
- Usuario: `admin_user`
- Contraseña: `admin_password`
- Base de datos: `db_concar`
- Puerto: `5432`

**PgAdmin:**
- Email: `admin@concar.local`
- Contraseña: `admin`

---

## 📦 Estructura de la Composición

### Servicios Incluidos:

#### 1. **postgres** - Base de Datos PostgreSQL
- Imagen: `postgres:16-alpine`
- Puerto: `5432` (mapeado)
- Volumen: `postgres_data` (persistencia)
- Health Check: Incluido
- Red: `concar-network`

#### 2. **backend** - API NestJS
- Build: Desde `Dockerfile` (multi-stage)
- Puerto: `5000` (mapeado)
- Depende de: PostgreSQL (wait for health)
- Variables: Configurables via `.env`
- Health Check: Verificación de Swagger
- Red: `concar-network`

#### 3. **pgadmin** - Gestor PostgreSQL (Opcional)
- Imagen: `dpage/pgadmin4:latest`
- Puerto: `5050` (mapeado)
- Acceso web: UI para gestionar BD

---

## 🛠️ Comandos Útiles

### Gestión de Contenedores
```bash
# Ver estado de todos los servicios
docker-compose ps

# Ver logs de un servicio específico
docker-compose logs backend
docker-compose logs postgres
docker-compose logs pgadmin

# Ver logs en tiempo real (tail -f)
docker-compose logs -f backend

# Acceder a la terminal del contenedor
docker-compose exec backend sh
docker-compose exec postgres psql -U admin_user -d db_concar

# Reiniciar un servicio específico
docker-compose restart backend
docker-compose restart postgres

# Detener todos los servicios
docker-compose stop

# Reanudar servicios detenidos
docker-compose start

# Detener y eliminar contenedores
docker-compose down

# Detener, eliminar contenedores Y volúmenes
docker-compose down -v
```

### Construir y Reconstruir
```bash
# Reconstruir la imagen del backend
docker-compose build backend

# Reconstruir sin cache
docker-compose build --no-cache backend

# Reconstruir todos
docker-compose build --no-cache
```

### Ejecutar Comandos en el Contenedor
```bash
# Ejecutar npm test en el contenedor
docker-compose exec backend npm test

# Ejecutar npm run lint
docker-compose exec backend npm run lint

# Ejecutar npm run build
docker-compose exec backend npm run build

# Acceder a psql en PostgreSQL
docker-compose exec postgres psql -U admin_user -d db_concar

# Ver version de Node
docker-compose exec backend node --version
```

---

## 🔍 Troubleshooting

### El backend no se conecta a PostgreSQL
```bash
# Verificar que PostgreSQL está saludable
docker-compose ps postgres

# Ver logs de PostgreSQL
docker-compose logs postgres

# Solución: Esperar a que PostgreSQL esté listo y reiniciar backend
docker-compose restart backend
```

### Cambios en el código no se reflejan
```bash
# Reconstruir la imagen
docker-compose down
docker-compose up -d --build

# O simplemente reconstruir y reiniciar
docker-compose up -d --build --force-recreate
```

### Puerto 5000 o 5432 ya está en uso
```bash
# Cambiar en .env
PORT=5001          # Backend en otro puerto
POSTGRES_PORT=5433 # PostgreSQL en otro puerto

# O matar el proceso que usa el puerto (Linux/Mac)
sudo lsof -i :5000
sudo kill -9 <PID>
```

### PgAdmin no se inicia
```bash
# Ver logs
docker-compose logs pgadmin

# Reconstruir sin cache
docker-compose build --no-cache pgadmin
docker-compose up -d pgadmin
```

### Permisos de volumen rechazados
```bash
# En Linux, ajustar permisos
docker-compose exec postgres chmod -R 755 /var/lib/postgresql/data
```

---

## 🔐 Seguridad en Producción

### ⚠️ IMPORTANTE: Cambiar Credenciales por Defecto

**Crear archivo `.env.production` con valores seguros:**

```bash
# PostgreSQL - Cambiar estas credenciales
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=<contraseña-fuerte-64-caracteres>
POSTGRES_DB=concar_prod

# JWT - Generar nuevos secretos
JWT_SECRET=<generar-con-openssl-rand-hex-32>
JWT_REFRESH_SECRET=<generar-con-openssl-rand-hex-32>

# SUNAT
SUNAT_TOKEN=<token-real-de-produccion>

# Frontend
FRONTEND_HOST=https://tu-dominio.com
```

**Generar secretos seguros:**
```bash
# Generar JWT_SECRET
openssl rand -hex 32

# Generar JWT_REFRESH_SECRET
openssl rand -hex 32
```

### Configuración de Producción Recomendada

1. **Deshabilitar PgAdmin** (descomentar la sección en docker-compose.yml)
2. **Usar variables de entorno secretas** (ver gestor de secretos)
3. **Configurar HTTPS** (con proxy reverso como Nginx)
4. **Limitar recursos** (agregar limits en docker-compose.yml)
5. **Usar redes privadas** (no expondremos todos los puertos)

---

## 📝 Variables de Entorno

### Variables del Backend

```env
# Entorno
NODE_ENV=production              # development, production, test
PORT=5000                        # Puerto de escucha

# PostgreSQL
POSTGRES_HOST=postgres           # Nombre del servicio en docker-compose
POSTGRES_PORT=5432              # Puerto de PostgreSQL
POSTGRES_USER=admin_user        # Usuario de BD
POSTGRES_PASSWORD=admin_password # Contraseña de BD
POSTGRES_DB=db_concar           # Nombre de BD
POSTGRES_SCHEMA=concar1         # Esquema por defecto

# JWT
JWT_SECRET=...                  # Secreto para tokens JWT
JWT_REFRESH_SECRET=...          # Secreto para refresh tokens
JWT_ACCESS_EXPIRES_IN=15m       # Duración de tokens de acceso
JWT_REFRESH_EXPIRES_IN=7d       # Duración de refresh tokens

# APIs Externas
SUNAT_TOKEN=...                 # Token para API SUNAT

# CORS
FRONTEND_HOST=http://localhost:3000  # URL del frontend
```

---

## 📚 Recursos Adicionales

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [NestJS Docker Guide](https://docs.nestjs.com/deployment/docker)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [PgAdmin Documentation](https://www.pgadmin.org/docs/)

---

## 🐛 Debug y Desarrollo

### Modo Desarrollo con Hot Reload

Para desarrollo con cambios automáticos:

```bash
# Editar docker-compose.yml y cambiar backend.build a:
volumes:
  - .:/app
  - /app/node_modules
  - /app/dist

# Luego ejecutar
docker-compose up -d --build
```

### Ver Logs en Tiempo Real
```bash
docker-compose logs -f backend
```

### Ejecutar Tests en Docker
```bash
docker-compose exec backend npm test
docker-compose exec backend npm run test:cov
docker-compose exec backend npm run test:e2e
```

---

## 📄 Archivo .env.example

Usar como referencia:
```bash
cp .env.docker .env
# Editar .env con tus valores
```

---

## ✅ Checklist de Verificación

- [ ] Docker y Docker Compose instalados
- [ ] Variables de entorno configuradas (.env)
- [ ] `docker-compose up -d` ejecutado exitosamente
- [ ] `docker-compose ps` muestra 3 servicios (postgres, backend, pgadmin)
- [ ] Backend health check PASSING
- [ ] PostgreSQL health check PASSING
- [ ] Acceso a http://localhost:5000/api/docs funciona
- [ ] Acceso a http://localhost:5050 funciona (PgAdmin)

---

**Última actualización:** Abril 2026
**Versión:** 1.0
