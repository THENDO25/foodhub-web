# Build FoodHub in a small Node.js container.
FROM node:22-bookworm-slim

WORKDIR /app

# better-sqlite3 may need native build tools when no prebuilt binary is available.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY . .

# Store the database in a mounted directory and run without root privileges.
RUN mkdir -p /app/backend/data && chown -R node:node /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/backend/data/foodhub.db
USER node

EXPOSE 3000
CMD ["node", "backend/server.js"]
