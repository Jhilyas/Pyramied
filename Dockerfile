FROM node:20-slim

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root deps (concurrently)
RUN npm install --production

# Copy server
COPY server/ ./server/
RUN cd server && npm install --production
RUN mkdir -p /data && chmod 777 /data

# Copy client and build
COPY client/ ./client/
RUN cd client && npm install && npm run build

# Set environment
ENV NODE_ENV=production
ENV PORT=7860

# HuggingFace Spaces uses port 7860
EXPOSE 7860

# Start the server
CMD ["node", "server/index.js"]
