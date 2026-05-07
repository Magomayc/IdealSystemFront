# ============================================
# Stage 1: Build da aplicação React/Vite
# ============================================
FROM node:22-alpine AS build
WORKDIR /app

# Copiar arquivos de dependências primeiro (cache de camadas)
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci

# Copiar todo o código fonte
COPY . .

# Argumento de build para a URL da API (via proxy reverso do Nginx)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build de produção
RUN npm run build

# ============================================
# Stage 2: Servir com Nginx
# ============================================
FROM nginx:alpine AS production

# Remover config padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar nossa configuração customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos buildados do stage anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Expor porta 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
