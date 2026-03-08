---
id: cloud
title: Cloud Deployment
sidebar_label: Cloud Providers
sidebar_position: 4
---

# Cloud Deployment

Deploy your Ever Works directory website to various cloud providers.

## AWS Deployment

### Using AWS Amplify

1. **Connect Repository**
   ```bash
   # Install Amplify CLI
   npm install -g @aws-amplify/cli
   
   # Initialize Amplify
   amplify init
   ```

2. **Configure Build Settings**
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

### Using EC2

Deploy on EC2 instances:

```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/ever-works/ever-works-website-template.git
cd ever-works-website-template/website
npm install
npm run build

# Start with PM2
pm2 start npm --name "ever-works" -- start
pm2 startup
pm2 save
```

## Google Cloud Platform

### Using Cloud Run

1. **Create Dockerfile**
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

2. **Deploy to Cloud Run**
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

### Using Azure Static Web Apps

1. **GitHub Actions Workflow**
   ```yaml
   # .github/workflows/azure-static-web-apps.yml
   name: Azure Static Web Apps CI/CD
   
   on:
     push:
       branches: [ main ]
   
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
           action: "upload"
           app_location: "/website"
           output_location: ".next"
   ```

## DigitalOcean

### Using App Platform

1. **Create App Spec**
   ```yaml
   # .do/app.yaml
   name: ever-works
   services:
   - name: web
     source_dir: /website
     github:
       repo: your-username/ever-works-website-template
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

2. **Deploy**
   ```bash
   # Using doctl CLI
   doctl apps create --spec .do/app.yaml
   ```

## Environment Configuration

### Common Environment Variables

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

### Security Considerations

1. **Secrets Management**
   - Use cloud provider secret managers
   - Never commit secrets to version control
   - Rotate secrets regularly

2. **Network Security**
   - Configure firewalls and security groups
   - Use HTTPS/TLS certificates
   - Enable DDoS protection

3. **Access Control**
   - Implement proper IAM policies
   - Use least privilege principle
   - Enable audit logging

## Monitoring and Scaling

### Health Checks

Implement health check endpoints:

```javascript
// pages/api/health.js
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
}
```

### Auto Scaling

Configure auto-scaling based on:
- CPU utilization
- Memory usage
- Request count
- Custom metrics

## Next Steps

- [Environment Variables](/docs/deployment/environment-variables) - Configure your deployment
- [Monitoring](/docs/deployment/monitoring) - Monitor your application
- [Support](/docs/advanced-guide/support) - Get deployment help
