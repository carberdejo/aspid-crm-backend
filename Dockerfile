# 1. Instalación de dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Construcción (Build)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Imagen de ejecución (Runner)
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

# Indispensable para optimizar librerías internas
ENV NODE_ENV=production

# Copiamos solo lo necesario para ahorrar espacio
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Creamos usuario de seguridad
# RUN adduser --disabled-password concaruser
# USER concaruser

# EXPOSE 3000

# Tu archivo .env lo pasarás al correr el contenedor, 
# no es necesario copiarlo dentro del Dockerfile por seguridad.
CMD [ "node", "dist/main" ] 