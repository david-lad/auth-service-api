# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# (Optional) Run migrations on build
# RUN npx prisma migrate deploy

# Build the NestJS app
RUN npm run build

# Expose the port (change if your app uses a different port)
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start:prod"]
