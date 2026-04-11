---
id: cloud
title: 云端部署
sidebar_label: 云服务提供商
sidebar_position: 4
---

# 云端部署

将您的 Ever Works 目录网站部署到各种云服务提供商。

## AWS 部署

### 使用 AWS Amplify

1. **连接仓库**

    ```bash
    # Install Amplify CLI
    npm install -g @aws-amplify/cli

    # Initialize Amplify
    amplify init
    ```

2. **配置构建设置**
    ```yaml
    # amplify.yml
    version: 1
    frontend:
        phases:
            preBuild:
                commands:
                    - cd website
                    - npm install
            build:
                commands:
                    - npm run build
        artifacts:
            baseDirectory: website/.next
            files:
                - '**/*'
    ```

### 使用 EC2

在 EC2 实例上部署：

```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template/website
npm install
npm run build

# Start with PM2
pm2 start npm --name "ever-works" -- start
pm2 startup
pm2 save
```

## Google Cloud Platform

### 使用 Cloud Run

1. **创建 Dockerfile**

    ```dockerfile
    FROM node:18-alpine
    WORKDIR /app
    COPY website/package*.json ./
    RUN npm install
    COPY website/ ./
    RUN npm run build
    EXPOSE 3000
    CMD ["npm", "start"]
    ```

2. **部署到 Cloud Run**

    ```bash
    # Build and push to Container Registry
    gcloud builds submit --tag gcr.io/PROJECT_ID/ever-works

    # Deploy to Cloud Run
    gcloud run deploy ever-works \
      --image gcr.io/PROJECT_ID/ever-works \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated
    ```

## Microsoft Azure

### 使用 Azure Static Web Apps

1. **GitHub Actions 工作流**

    ```yaml
    # .github/workflows/azure-static-web-apps.yml
    name: Azure Static Web Apps CI/CD

    on:
        push:
            branches: [main]

    jobs:
        build_and_deploy_job:
            runs-on: ubuntu-latest
            steps:
                - uses: actions/checkout@v2
                - name: Build And Deploy
                  uses: Azure/static-web-apps-deploy@v1
                  with:
                      azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
                      repo_token: ${{ secrets.GITHUB_TOKEN }}
                      action: 'upload'
                      app_location: '/website'
                      output_location: '.next'
    ```

## DigitalOcean

### 使用 App Platform

1. **创建应用规格**

    ```yaml
    # .do/app.yaml
    name: ever-works
    services:
        - name: web
          source_dir: /website
          github:
              repo: your-username/directory-web-template
              branch: main
          run_command: npm start
          build_command: npm run build
          environment_slug: node-js
          instance_count: 1
          instance_size_slug: basic-xxs
          envs:
              - key: NODE_ENV
                value: production
    ```

2. **部署**
    ```bash
    # Using doctl CLI
    doctl apps create --spec .do/app.yaml
    ```

## 环境配置

### 常见环境变量

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://your-api.com

# Database
DATABASE_URL=your-database-connection-string

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 安全注意事项

1. **密钥管理**
    - 使用云提供商的密钥管理服务
    - 切勿将密钥提交到版本控制
    - 定期轮换密钥

2. **网络安全**
    - 配置防火墙和安全组
    - 使用 HTTPS/TLS 证书
    - 启用 DDoS 保护

3. **访问控制**
    - 实施适当的 IAM 策略
    - 遵循最小权限原则
    - 启用审计日志

## 监控与扩展

### 健康检查

实现健康检查端点：

```javascript
// pages/api/health.js
export default function handler(req, res) {
	res.status(200).json({
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
}
```

### 自动扩缩容

根据以下指标配置自动扩缩容：

- CPU 使用率
- 内存使用率
- 请求数量
- 自定义指标

## 下一步

- [环境变量](/deployment/environment-variables) - 配置您的部署
- [监控](/deployment/monitoring) - 监控您的应用程序
- [支持](/advanced-guide/support) - 获取部署帮助
