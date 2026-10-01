FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Ensure data directory exists
RUN mkdir -p data

ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
