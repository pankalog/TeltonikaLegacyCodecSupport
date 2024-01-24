# Use Node.js v14 as the base image
FROM node:14

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY src .

# Compile TypeScript to JavaScript
RUN npx tsc index.ts

# Use .env file for environment variables
ARG ENV_FILE
ENV ENV_FILE=${ENV_FILE:-.env}
COPY ${ENV_FILE} .env
#
#
## print files
#RUN ls -la

# Set the command to run your application
CMD [ "node", "index.js" ]