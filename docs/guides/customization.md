---
id: customization
title: Customization Guide
sidebar_label: Customization
sidebar_position: 2
---

# Customization Guide

Learn how to customize your Ever Works directory website to match your brand and requirements.

## Theme Customization

### Colors and Branding

Customize your site's colors and branding by editing the theme configuration:

```yaml
# .content/config.yml
theme:
  default: "everworks"
  custom_colors:
    primary: "#3d70ef"
    secondary: "#00c853"
    accent: "#ff6b35"
```

### Logo and Assets

Replace the default logos and assets:

1. **Logo**: Replace files in `public/` folder
2. **Favicon**: Update `public/favicon.ico`
3. **Images**: Add your custom images to `public/images/`

## Layout Customization

### Header and Navigation

Customize the header and navigation in your configuration:

```yaml
# .content/config.yml
navigation:
  header:
    logo: "/images/your-logo.svg"
    links:
      - title: "Home"
        url: "/"
      - title: "Directory"
        url: "/directory"
```

### Footer

Customize the footer content:

```yaml
# .content/config.yml
footer:
  copyright: "© 2024 Your Company Name"
  links:
    - title: "Privacy Policy"
      url: "/privacy"
    - title: "Terms of Service"
      url: "/terms"
```

## Content Customization

### Homepage

Edit the homepage content by modifying:
- Hero section text
- Feature highlights
- Call-to-action buttons

### Directory Pages

Customize how directory items are displayed:
- Card layouts
- Filtering options
- Search functionality

## Advanced Customization

For more advanced customization, you can:

1. **Custom CSS**: Add custom styles
2. **Component Overrides**: Override default components
3. **Custom Layouts**: Create new page layouts
4. **API Integration**: Connect with external services

## Next Steps

- [Admin Dashboard](/docs/guides/admin-dashboard) - Manage your content
- [Deployment](/docs/deployment) - Deploy your customized site
- [Support](/docs/advanced-guide/support) - Get help with customization
