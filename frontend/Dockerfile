# Optional: docker compose --profile frontend up frontend
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:8888
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:22-alpine
RUN npm install -g serve@14
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
