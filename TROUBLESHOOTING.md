# Troubleshooting Guide

## Common Issues and Solutions

### Tailwind CSS Build Errors

If you encounter errors like "Invalid declaration: `max-w-4xl`" or similar Tailwind CSS-related errors:

#### Cause
This error typically occurs when:
1. Vite's build cache contains stale data
2. Node modules are out of sync
3. A file was deleted but is still referenced in the cache

#### Solution

1. **Clear Vite cache:**
   ```bash
   rm -rf .vite
   rm -rf node_modules/.vite
   ```

2. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

3. **Clear browser cache and restart dev server:**
   ```bash
   npm run dev
   ```

4. **If the error persists, try a clean build:**
   ```bash
   rm -rf dist
   npm run build
   ```

### File Not Found Errors

If you see errors referencing files that don't exist in the repository (e.g., `/Users/[username]/...`):

This indicates a cached reference to a deleted or moved file. Follow the cache clearing steps above.

### Tailwind CSS v4 Notes

This project uses Tailwind CSS v4, which has a different configuration approach:
- Configuration is done via CSS using `@import "tailwindcss"`
- No `tailwind.config.js` file is needed
- All standard Tailwind utilities (including `max-w-4xl`) are available by default

## Getting Help

If you continue to experience issues after trying these solutions:
1. Check that you're using Node.js version 18 or higher
2. Ensure all dependencies are installed: `npm install`
3. Check the console for specific error messages
4. Review recent changes in git history: `git log`
