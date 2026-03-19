---
id: data-versioning
title: Data Version Display System
sidebar_label: Data Versioning
sidebar_position: 6
---

# Data Version Display System

Ever Works includes a data versioning system that shows users the current version of data they're viewing, providing transparency about content freshness.

## Overview

The system provides:
- 📊 **Real-time version display** - Shows current data repository version
- 🔄 **Auto-refresh** - Periodically updates version information
- 🎨 **Multiple variants** - Badge, inline, and detailed views
- 💡 **Tooltip details** - Hover for comprehensive information
- ⚡ **ISR support** - Works with Incremental Static Regeneration
- 🛡️ **Error handling** - Graceful fallback when unavailable

## Architecture

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## Components

### VersionDisplay

Main component for displaying version information.

```tsx
import { VersionDisplay } from "@/components/version";

// Basic inline display
<VersionDisplay variant="inline" />

// Badge variant
<VersionDisplay variant="badge" />

// Detailed view with additional information
<VersionDisplay variant="detailed" showDetails={true} />
```

**Props**:
- `variant`: `"inline" | "badge" | "detailed"` - Display style
- `showDetails`: `boolean` - Show extended information (detailed variant only)
- `className`: `string` - Additional CSS classes
- `refreshInterval`: `number` - Auto-refresh interval in ms (default: 5 minutes)

### VersionTooltip

Wrapper component that adds a tooltip with detailed version information.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**Features**:
- Shows commit hash and date
- Displays commit message
- Shows author information
- Links to repository

### useVersionInfo Hook

Custom hook for managing version information with caching and auto-refresh.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  retryOnError: true,
  retryDelay: 10000
});
```

**Returns**:
- `versionInfo`: Version data object
- `loading`: Loading state
- `error`: Error state
- `refetch`: Manual refresh function

## API Endpoint

### GET /api/version

Returns current data repository version information.

**Response**:
```json
{
  "commit": "abc1234",
  "date": "2024-01-01T12:00:00.000Z",
  "message": "Update data items",
  "author": "Developer Name",
  "repository": "https://github.com/owner/repo",
  "lastSync": "2024-01-01T12:05:00.000Z"
}
```

**Features**:
- Automatic repository sync before fetching
- Proper cache headers for optimal performance
- ETag support for efficient caching
- Error handling with appropriate HTTP status codes

**Cache Headers**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## Configuration

### Environment Variables

```env
# Data repository URL
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# GitHub token for private repositories (optional)
GH_TOKEN=ghp_your_github_token_here

# Repository sync interval (optional, default: 5 minutes)
REPO_SYNC_INTERVAL=300000
```

### Caching Strategy

#### Client-side Cache
- **Duration**: 1 minute
- **Strategy**: stale-while-revalidate
- **Refresh**: Automatic background updates

#### Server-side Cache
- **Duration**: 60 seconds
- **Strategy**: s-maxage with revalidation
- **ETag**: Commit hash-based

## Usage Examples

### Footer Version Badge

```tsx
// components/footer/Footer.tsx
import { VersionDisplay } from "@/components/version";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <p>© 2024 Ever Works</p>
        <VersionDisplay variant="badge" />
      </div>
    </footer>
  );
}
```

### Admin Dashboard

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // 1 minute
      />
    </div>
  );
}
```

### Custom Implementation

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>Loading version...</div>;
  if (error) return <div>Version unavailable</div>;

  return (
    <div>
      <p>Data version: {versionInfo.commit.substring(0, 7)}</p>
      <p>Updated: {new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

## Display Variants

### Inline Variant

Compact text display suitable for footers or sidebars.

```tsx
<VersionDisplay variant="inline" />
// Output: "Data v.abc1234 • Updated 2 hours ago"
```

### Badge Variant

Pill-shaped badge with icon, perfect for headers or navigation.

```tsx
<VersionDisplay variant="badge" />
// Output: [🔄 v.abc1234]
```

### Detailed Variant

Comprehensive view with all version information.

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// Output: Card with commit, date, message, author, repository link
```

## Best Practices

### 1. Placement
- **Footer**: Use inline or badge variant
- **Admin panels**: Use detailed variant
- **Headers**: Use badge variant
- **Tooltips**: Wrap any variant with VersionTooltip

### 2. Refresh Intervals
- **Public pages**: 5-10 minutes
- **Admin pages**: 1-2 minutes
- **Real-time dashboards**: 30 seconds

### 3. Error Handling
- Always provide fallback UI
- Log errors for monitoring
- Show user-friendly messages

### 4. Performance
- Use appropriate cache durations
- Implement stale-while-revalidate
- Avoid excessive API calls

## Troubleshooting

### Version Not Updating

**Issue**: Version information doesn't refresh

**Solution**: Check refresh interval and cache settings

```tsx
// Force immediate refresh
const { refetch } = useVersionInfo();
refetch();
```

### API Errors

**Issue**: `/api/version` returns errors

**Solution**: Verify environment variables and repository access

```bash
# Check environment variables
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Test repository access
git ls-remote $DATA_REPOSITORY
```

### Slow Loading

**Issue**: Version component loads slowly

**Solution**: Optimize caching and reduce refresh frequency

```tsx
<VersionDisplay 
  variant="badge"
  refreshInterval={600000} // 10 minutes
/>
```

## Advanced Features

### Manual Sync Trigger

```typescript
// app/api/version/sync/route.ts
export async function POST() {
  await syncRepository();
  return NextResponse.json({ success: true });
}
```

### Version Change Notifications

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";
import { useEffect } from "react";

export function VersionWatcher() {
  const { versionInfo } = useVersionInfo();
  
  useEffect(() => {
    if (versionInfo) {
      // Notify user of new version
      console.log('New data version:', versionInfo.commit);
    }
  }, [versionInfo?.commit]);
  
  return null;
}
```

### Custom Formatting

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";
import { formatDistanceToNow } from "date-fns";

export function CustomVersion() {
  const { versionInfo } = useVersionInfo();
  
  return (
    <div>
      <span>v{versionInfo.commit.substring(0, 7)}</span>
      <span>{formatDistanceToNow(new Date(versionInfo.date))} ago</span>
    </div>
  );
}
```

## Next Steps

- [Testing](./testing) - Test your implementation
- [API Documentation](./api-documentation) - Learn about API docs
- [Deployment](/docs/deployment) - Deploy with version tracking

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [Next.js ISR](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration)
- [SWR Documentation](https://swr.vercel.app/)
- [Cache-Control Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

