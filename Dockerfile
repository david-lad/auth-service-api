
# ----------- Build Stage -----------
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --production=false
COPY . .
# Generate Prisma client
RUN npx prisma generate
# Build the NestJS app
RUN npm run build

# ----------- Production Stage -----------
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Generate Prisma client in production image (required for runtime)
RUN npx prisma generate
# Run migrations on container start
CMD npx prisma migrate deploy && npm run start:prod

EXPOSE 7000
