# 1. Instalación de dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat

# Activamos pnpm nativo
RUN corepack enable

WORKDIR /app

# Cambiamos package-lock por pnpm-lock
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 2. Construcción (Build)
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# 3. Imagen de ejecución (Runner)
FROM node:20-alpine AS runner
RUN corepack enable
WORKDIR /usr/src/app

# Indispensable para optimizar librerías internas
ENV NODE_ENV=production

# Copiamos solo lo necesario para ahorrar espacio
COPY package.json pnpm-lock.yaml ./

# Instalamos solo dependencias de producción. 
# En pnpm no es necesario forzar el limpiado de caché de la misma forma que en npm, 
# ya que su manejo del store es mucho más eficiente en imágenes Alpine.
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

# Buena práctica de seguridad: Cambiamos al usuario sin privilegios 'node'
# que ya viene preinstalado en la imagen alpine
USER node

# Tu archivo .env lo pasarás al correr el contenedor, 
# no es necesario copiarlo dentro del Dockerfile por seguridad.
CMD [ "node", "dist/main" ]