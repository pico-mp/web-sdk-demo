# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (SDK_Unit_Test 등 상위 폴더 의존성이 없는 독립된 프로젝트이므로 단순 패키지 설치)
COPY package*.json ./
RUN npm install

# Copy source and build (Vite build)
COPY . .
RUN npm run build

# Runner Stage (Nginx)
FROM nginx:stable-alpine
# Custom nginx config (SPA 대응)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Build 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
