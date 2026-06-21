---
name: Stripe API version
description: The Stripe SDK version in this project requires apiVersion "2026-05-27.dahlia"
---

When constructing a Stripe instance in this project, use:
```typescript
new Stripe(key, { apiVersion: "2026-05-27.dahlia" })
```

**Why:** The installed `stripe` npm package version requires this specific API version string. Using older version strings (e.g. `"2023-10-16"`) causes TypeScript errors because the type for `apiVersion` is a string literal union that doesn't include older versions.
