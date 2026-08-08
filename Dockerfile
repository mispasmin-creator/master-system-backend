# syntax=docker/dockerfile:1
FROM node:22-alpine

# Prisma on alpine needs OpenSSL + libc compat, otherwise the schema engine
# fails with "Could not parse schema engine response".
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies first (better layer caching). A lockfile is present, so
# use `npm ci` for a clean, reproducible install. devDependencies (the prisma
# CLI) are needed for `prisma generate` / `prisma db push`, so do NOT omit them.
COPY package*.json ./
RUN npm ci

# App source — includes prisma/schema.prisma.
COPY . .

# Generate the Prisma client for THIS (alpine / linux-musl) runtime. Runs here
# so the engine binary matches the container; fail loudly if the schema breaks.
RUN npx prisma generate

EXPOSE 5000

# Default start command. docker-compose overrides this to first sync the schema
# (`prisma db push`) once the database is healthy.
CMD ["node", "server.js"]
