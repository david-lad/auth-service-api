
# ----------- Build Stage -----------
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
# Build the NestJS app
RUN npm run build

# ----------- Production Stage -----------
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache openssl dumb-init
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Generate Prisma client for production
RUN npx prisma generate

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]

EXPOSE 3000
