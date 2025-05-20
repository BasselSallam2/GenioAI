# Use the official Node.js image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Copy the Prisma schema before installing dependencies
COPY prisma ./prisma

# Install dependencies (without postinstall issues)
RUN npm install --omit=dev

# Run Prisma generate (after the schema is inside the container)
RUN npx prisma generate

# Copy the rest of the application files
COPY . .

# Expose the application port
EXPOSE 3000

# Start the Node.js server
CMD ["node", "server.js"]
