---
id: support
title: Support & Help
sidebar_label: Support
---

# Support & Help

Welcome to the Ever Works Website Template support center.

## Getting Help

### Community Support

- **[GitHub Issues](https://github.com/ever-works/directory-web-template/issues)** -- Report bugs, request features, or ask technical questions
- **[Discord Community](https://discord.gg/ever)** -- Join our active Discord server for real-time support
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/directory-web-template)** -- Ask technical questions with the `directory-web-template` tag

### Professional Support

- **[Email Support](mailto:ever@ever.co)** -- Direct support for business inquiries
- **[Security Issues](mailto:security@ever.co)** -- Report security vulnerabilities privately
- **[Enterprise Support](https://ever.co/contacts)** -- Dedicated support for enterprise customers

## Documentation Resources

- **[Installation Guide](/docs/getting-started/installation)** -- Complete setup instructions
- **[Quick Start Guide](/docs/getting-started/quick-start)** -- Get up and running quickly
- **[Architecture Overview](/docs/architecture/overview)** -- Understand the system design
- **[Deployment Guide](/docs/deployment/deployment-introduction)** -- Deploy to production

For Ever Works Platform documentation, visit [docs.ever.works](https://docs.ever.works).

## Demo & Examples

- **[Demo Site](https://demo.ever.works)** -- See the template in action
- **[GitHub Repository](https://github.com/ever-works/directory-web-template)** -- Source code and examples

## Troubleshooting

### Common Issues

#### Installation Problems

- **Node.js Version**: Ensure you are using Node.js 20+
- **Package Manager**: Use pnpm (strictly enforced). Run `corepack enable` to activate it.
- **Dependencies**: Run `pnpm install` in the repository root
- **Port Conflicts**: The dev server defaults to port 3000. Use `--port` flag to specify a different port.

#### Build Issues

- **TypeScript Errors**: Run `pnpm tsc --noEmit` to check for type errors
- **Missing Dependencies**: Ensure all packages are properly installed with `pnpm install`
- **Environment Variables**: Verify your `.env.local` file is configured (copy from `.env.example`)

#### Runtime Issues

- **Authentication**: Verify your OAuth provider credentials in `.env.local`
- **Database**: Ensure your PostgreSQL connection string is correct
- **Migrations**: Run `pnpm db:migrate` to apply pending database migrations

### Debug Mode

Enable debug logging by setting environment variables:

```bash
DEBUG=directory-web-template:*
NODE_ENV=development
```

## Enterprise Support

For enterprise customers, we offer:

- **Priority Support** -- Dedicated support channels
- **Custom Integrations** -- Tailored solutions for your needs
- **Training & Onboarding** -- Get your team up to speed quickly
- **SLA Guarantees** -- Service level agreements for critical deployments

Contact us at [ever@ever.co](mailto:ever@ever.co) for enterprise support options.

## Contact Information

- **Website**: [ever.works](https://ever.works)
- **Email**: [ever@ever.co](mailto:ever@ever.co)
- **Twitter**: [@everworks](https://twitter.com/everworks)
- **Discord**: [Join our community](https://discord.gg/ever)
