# Quick Start

Get your directory website up and running in under 10 minutes! This guide assumes you've already completed the [installation](./installation).

## Step 1: Basic Configuration

### Configure Site Settings

Edit `.content/config.yml` (this file will be created after first sync):

```yaml
# Basic site settings
company_name: "Your Company"
item_name: "Tool"
items_name: "Tools"
copyright_year: 2024

# Enable features
content_table: true
auth:
  credentials: true
  google: true
  github: true

# Payment settings
payment:
  provider: "stripe"
pricing:
  free: 0
  pro: 10
  sponsor: 20
```

### Set Up Data Repository

1. **Fork the data repository**:
   - Visit [awesome-data](https://github.com/ever-works/awesome-data)
   - Click "Fork" to create your copy

2. **Update environment variables**:
   ```bash
   # In .env.local
   DATA_REPOSITORY="https://github.com/YOUR_USERNAME/awesome-data"
   GH_TOKEN="your_github_token"
   ```

3. **Generate GitHub token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create a token with `repo` permissions
   - Add it to your `.env.local`

## Step 2: Start the Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your site!

## Step 3: Add Your First Item

### Method 1: Direct File Edit

1. Navigate to your forked data repository
2. Create a new file in `items/` folder: `my-awesome-tool.yml`
3. Add content:

```yaml
id: "my-awesome-tool"
name: "My Awesome Tool"
slug: "my-awesome-tool"
description: "An amazing tool that does incredible things"
source_url: "https://example.com"
category: "productivity"
tags:
  - "productivity"
  - "tools"
featured: false
status: "approved"
updated_at: "2024-01-15 10:30"
```

### Method 2: Submission Form

1. Visit your site at `http://localhost:3000/submit`
2. Fill out the submission form
3. The item will be created as a pull request in your data repository

## Step 4: Customize Your Site

### Update Branding

1. **Logo**: Replace files in `public/` folder
2. **Colors**: Edit theme in `.content/config.yml`:

```yaml
theme:
  default: "everworks"
  custom_colors:
    primary: "#3d70ef"
    secondary: "#00c853"
```

3. **Metadata**: Update `app/layout.tsx` for SEO

### Configure Categories

Create `categories/productivity.yml` in your data repository:

```yaml
id: "productivity"
name: "Productivity"
slug: "productivity"
description: "Tools to boost your productivity"
icon_url: "https://example.com/icon.png"
```

## Step 5: Set Up Authentication (Optional)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add to `.env.local`:

```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### GitHub OAuth

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Add to `.env.local`:

```bash
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

## Step 6: Test Everything

### Verify Content Loading
- Check that your items appear on the homepage
- Test category filtering
- Verify search functionality

### Test Authentication
- Try signing in with configured providers
- Check user profile creation
- Test admin access (if configured)

### Test Submission Flow
- Submit a new item via the form
- Check that it creates a pull request
- Verify email notifications (if configured)

## Step 7: Deploy (Optional)

For a quick deployment to Vercel:

1. **Connect to Vercel**:
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Set environment variables** in Vercel dashboard

3. **Update URLs** in your OAuth app settings

## Common Customizations

### Change Item Types

Instead of "tools", you might want "services" or "products":

```yaml
# In config.yml
item_name: "Service"
items_name: "Services"
```

### Add Custom Fields

Extend item schema in your YAML files:

```yaml
# In items/example.yml
price: "$9.99"
rating: 4.5
author: "John Doe"
```

### Modify Layouts

The template supports multiple layout types:
- Grid (default)
- Masonry
- Cards
- Classic list

Users can switch between them using the layout toggle.

## Next Steps

Now that you have a working site:

1. [Customize your site](../guides/customization)
2. [Deploy to production](../deployment/overview)

## Getting Help

- **Documentation**: Browse the full docs for detailed guides
- **Examples**: Check the [demo site](https://demo.ever.works) for inspiration
- **Community**: Join our [Discord](https://discord.gg/ever) for support
- **Issues**: Report problems on [GitHub](https://github.com/ever-works/ever-works-website-template/issues)
