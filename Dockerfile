FROM node:22

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 8000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Run database migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]