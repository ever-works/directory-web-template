---
id: docker
title: Docker 部署
sidebar_label: Docker
sidebar_position: 2
---

# Docker 部署

使用 Docker 容器部署您的 Ever Works 目录网站。

## 前提条件

- 系统上已安装 Docker
- Docker Compose（可选，但推荐）

## Docker 快速入门

### 1. 构建 Docker 镜像

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. 运行容器

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

您的网站将可通过 `http://localhost:3000` 访问。

## Docker Compose 配置

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
    app:
        build: .
        ports:
            - '3000:3000'
        environment:
            - NODE_ENV=production
            - NEXT_PUBLIC_API_BASE_URL=https://your-api.com
        volumes:
            - ./.content:/app/.content
        restart: unless-stopped

    # Optional: Add a database service
    postgres:
        image: postgres:15
        environment:
            POSTGRES_DB: everworks
            POSTGRES_USER: user
            POSTGRES_PASSWORD: password
        volumes:
            - postgres_data:/var/lib/postgresql/data
        restart: unless-stopped

volumes:
    postgres_data:
```

### 使用 Docker Compose 运行

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 环境变量

使用环境变量配置您的部署：

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## 生产注意事项

### 安全性

- 对敏感数据使用密钥管理
- 使用反向代理（nginx、Traefik）启用 HTTPS
- 定期安全更新

### 性能

- 使用多阶段构建来减小镜像大小
- 配置适当的资源限制
- 启用层缓存

### 监控

- 添加健康检查
- 配置日志记录
- 设置监控和告警

## 下一步

- [环境变量](/docs/deployment/environment-variables) - 配置您的部署
- [监控](/docs/deployment/monitoring) - 监控您的应用程序
- [支持](/docs/advanced-guide/support) - 获取部署帮助
