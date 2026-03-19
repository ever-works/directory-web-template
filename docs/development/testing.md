---
id: testing
title: Responsive Testing Guide
sidebar_label: Testing
sidebar_position: 4
---

# Responsive Testing Guide

This guide covers best practices for testing responsive design across different devices and screen sizes.

## Test Devices

### Mobile (320px - 768px)

| Device | Resolution | Notes |
|--------|------------|-------|
| iPhone SE | 375x667 | Smallest modern iPhone |
| iPhone 12/13/14 | 390x844 | Standard iPhone size |
| Samsung Galaxy S20 | 360x800 | Popular Android device |
| iPad Mini Portrait | 768x1024 | Small tablet |

### Tablet (768px - 1024px)

| Device | Resolution | Notes |
|--------|------------|-------|
| iPad Air | 820x1180 | Standard iPad |
| iPad Pro 11" | 834x1194 | Professional tablet |
| Surface Pro 7 | 912x1368 | Windows tablet |

### Desktop (1024px+)

| Device | Resolution | Notes |
|--------|------------|-------|
| Laptop | 1366x768 | Common laptop resolution |
| Desktop HD | 1920x1080 | Standard desktop |
| 4K Monitor | 3840x2160 | High-resolution display |

## Testing Checklist

### 1. Navigation

- [ ] **Mobile**: Hamburger menu visible and functional
- [ ] **Desktop**: Horizontal navigation bar displays correctly
- [ ] **All devices**: All navigation links are accessible
- [ ] **Touch targets**: Minimum 44x44px on mobile
- [ ] **Keyboard navigation**: Tab order is logical

### 2. Content

- [ ] **Text readability**: No zoom required to read content
- [ ] **Images**: Responsive and properly sized for each breakpoint
- [ ] **No horizontal scroll**: Content fits within viewport
- [ ] **Line length**: Optimal reading width (45-75 characters)
- [ ] **Font sizes**: Appropriate for each device size

### 3. Interactions

- [ ] **Touch targets**: Minimum 44x44px for mobile
- [ ] **Spacing**: Sufficient space between clickable elements
- [ ] **Hover states**: Only on devices with hover capability
- [ ] **Focus states**: Visible keyboard focus indicators
- [ ] **Forms**: Easy to fill on mobile devices

### 4. Performance

- [ ] **Load time**: < 3 seconds on 3G connection
- [ ] **Images**: Optimized for each screen size
- [ ] **Animations**: Smooth 60 FPS performance
- [ ] **Core Web Vitals**: Meet Google's thresholds
- [ ] **Bundle size**: Optimized JavaScript and CSS

### 5. Layout

- [ ] **Grid system**: Adapts correctly at breakpoints
- [ ] **Flexbox/Grid**: No layout breaks
- [ ] **Spacing**: Consistent padding and margins
- [ ] **Alignment**: Proper alignment at all sizes
- [ ] **Overflow**: No content overflow issues

## Testing Tools

### Browser DevTools

#### Chrome DevTools
1. Open DevTools (F12 or Cmd+Option+I)
2. Click device toolbar icon (Cmd+Shift+M)
3. Select device or enter custom dimensions
4. Test different network speeds

#### Firefox Developer Tools
1. Open DevTools (F12)
2. Click Responsive Design Mode (Cmd+Option+M)
3. Select device presets
4. Test touch events

### Online Testing Services

- **[BrowserStack](https://www.browserstack.com/)** - Test on real devices
- **[LambdaTest](https://www.lambdatest.com/)** - Cross-browser testing
- **[Sauce Labs](https://saucelabs.com/)** - Automated testing platform

### Performance Testing

- **[Lighthouse](https://developers.google.com/web/tools/lighthouse)** - Performance audit
- **[WebPageTest](https://www.webpagetest.org/)** - Detailed performance analysis
- **[PageSpeed Insights](https://pagespeed.web.dev/)** - Google's performance tool

## Target Metrics

### Lighthouse Scores

| Metric | Target | Critical |
|--------|--------|----------|
| Performance | > 90 | > 50 |
| Accessibility | > 95 | > 80 |
| Best Practices | > 95 | > 80 |
| SEO | > 95 | > 80 |

### Core Web Vitals

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID** (First Input Delay) | < 100ms | 100ms - 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 |

### Mobile-Specific Metrics

- **First Contentful Paint**: < 1.8s
- **Time to Interactive**: < 3.8s
- **Touch Target Size**: >= 48x48px
- **Tap Delay**: < 300ms

## Testing Workflow

### 1. Local Testing

```bash
# Start development server
npm run dev

# Open in browser
http://localhost:3000
```

### 2. Device Testing

1. **Use DevTools responsive mode**
2. **Test on physical devices** when possible
3. **Use remote debugging** for mobile devices
4. **Test different orientations** (portrait/landscape)

### 3. Automated Testing

```bash
# Run Lighthouse audit
npm run lighthouse

# Run accessibility tests
npm run test:a11y

# Run visual regression tests
npm run test:visual
```

## Common Issues and Solutions

### Issue: Horizontal Scroll on Mobile

**Solution**: Check for fixed-width elements

```css
/* ❌ Bad */
.container {
  width: 1200px;
}

/* ✅ Good */
.container {
  max-width: 1200px;
  width: 100%;
  padding: 0 1rem;
}
```

### Issue: Text Too Small on Mobile

**Solution**: Use responsive font sizes

```css
/* ❌ Bad */
body {
  font-size: 12px;
}

/* ✅ Good */
body {
  font-size: 16px; /* Base size for mobile */
}

@media (min-width: 768px) {
  body {
    font-size: 18px;
  }
}
```

### Issue: Touch Targets Too Small

**Solution**: Ensure minimum 44x44px size

```css
/* ✅ Good */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}
```

### Issue: Images Not Responsive

**Solution**: Use responsive image techniques

```jsx
// ✅ Good - Next.js Image component
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority
/>
```

## Best Practices

### 1. Mobile-First Approach
- Design for mobile first, then enhance for larger screens
- Use `min-width` media queries instead of `max-width`

### 2. Progressive Enhancement
- Ensure core functionality works without JavaScript
- Add enhancements for capable browsers

### 3. Touch-Friendly Design
- Minimum 44x44px touch targets
- Adequate spacing between interactive elements
- Avoid hover-only interactions

### 4. Performance Optimization
- Lazy load images and components
- Minimize JavaScript bundle size
- Use code splitting
- Optimize fonts and assets

### 5. Accessibility
- Test with screen readers
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Provide text alternatives for images

## Next Steps

- [Local Setup](./local-setup) - Set up your development environment
- [API Documentation](./api-documentation) - Learn about API docs
- [Deployment](/docs/deployment) - Deploy your application

## Resources

- [Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [Mobile-First CSS](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Web.dev Performance](https://web.dev/performance/)

