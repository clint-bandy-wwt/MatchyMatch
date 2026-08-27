# Agent Workflow Guidelines

This document outlines best practices for AI agents making changes to this repository.

## Pre-Commit Validation Checklist

**Always run these checks before committing and pushing changes:**

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Lint Check
```bash
npm run lint
```
- Runs ESLint on all `.js` and `.jsx` files
- Catches syntax errors, unused variables, and code style issues
- **Must pass before committing**

### 3. Build Check
```bash
npm run build
```
- Performs full Vite build with Oxc parsing
- Catches parse errors and module resolution issues
- **Must pass before committing**

### 4. Commit with Message
```bash
git add .
git commit -m "Descriptive commit message"
```

### 5. Push Changes
```bash
git push
```

## Complete Workflow Template

```bash
# Make your code changes...

# Install dependencies if needed
npm install --legacy-peer-deps

# Verify no syntax errors
npm run lint

# Full build validation
npm run build

# If both pass, commit
git add .
git commit -m "Your descriptive message"

# Push to remote
git push
```

## Common Issues & Solutions

### Lint Fails
- Run `npm run lint` to see detailed error messages
- Common issues:
  - Missing variable declarations (`const TILES = [`)
  - Orphaned statements or arrays
  - Unused variables
  - Mismatched braces or quotes

**Example error:**
```
[PARSE_ERROR] Unexpected token
     ╭─[ src/components/GamePicker.jsx:279:1 ]
     │
 279 │ ]
     │ ┬  
     │ ╰── Missing const declaration
```

### Build Fails
- Run `npm run build` to see detailed error messages
- Common issues:
  - Parse errors in JSX/JS files
  - Missing imports or module resolution failures
  - Syntax errors that eslint may have missed

### Missing Dependencies
- Always run `npm install --legacy-peer-deps` first
- The `--legacy-peer-deps` flag is needed due to peer dependency conflicts in the project

## Key Project Files

| File | Purpose |
|------|---------|
| `package.json` | Lists all npm scripts and dependencies |
| `eslint.config.js` | ESLint configuration and rules |
| `vite.config.js` | Vite build configuration |
| `jest.config.js` | Jest test configuration |
| `src/App.jsx` | Main React component and game routing |
| `src/components/GamePicker.jsx` | Game selection UI and registry |

## Real-World Example: What Went Wrong

❌ **Failed Workflow (What Happened):**
```bash
# Created PongBoard component with green theme
# Made updates to GamePicker.jsx to register the game
# Committed without validation
git commit -m "Update Pong game and GamePicker"
git push

# User tried to build locally:
npm run build

# Build failed with parse error:
[plugin:vite:oxc] Transform failed with 1 error:
[PARSE_ERROR] Unexpected token
     ╭─[ src/components/GamePicker.jsx:279:1 ]
```

✅ **Correct Workflow (What Should Happen):**
```bash
# Create PongBoard component with green theme
# Make updates to GamePicker.jsx

# Always validate before committing!
npm install --legacy-peer-deps

npm run lint
# ✓ All checks passed

npm run build
# ✓ Build successful

# Now it's safe to commit and push
git add .
git commit -m "Apply green theme to Pong game"
git push
```

## Testing (Optional but Recommended)

While not required for every change, running tests can catch logic errors:
```bash
npm test                  # Run all tests once
npm test:watch           # Run in watch mode
npm test:coverage        # Generate coverage report
```

## Pre-Push Final Checklist

Before running `git push`, verify:
- [ ] `npm run lint` exits with code 0 (passes)
- [ ] `npm run build` completes successfully
- [ ] No new files are accidentally included
- [ ] Commit message is descriptive and clear
- [ ] Changes match the requested requirements

## Branch Strategy

- Code changes are made on feature branches (e.g., `forge/xxxxx`)
- Always push to the feature branch first
- PRs are created from feature branches to `main`
- All validation must pass before PR is merged

## Troubleshooting

### "npm: command not found"
- Node.js and npm must be installed
- Check: `node --version` and `npm --version`

### "@eslint/js not found"
- Run `npm install --legacy-peer-deps` to install dependencies

### Port already in use (dev server)
- Kill the existing process or use: `npm run dev -- --port 3001`

### Build takes too long
- This is normal for first build
- Subsequent builds are cached and faster

## Need Help?

If validation fails:
1. Read the error message carefully - it shows the exact problem and location
2. Check the file and line number mentioned in the error
3. Fix the issue (usually syntax error or missing declaration)
4. Re-run the validation command: `npm run lint && npm run build`
5. Once all checks pass, commit and push

## Key Rules

**🚫 DON'T:**
- Commit without running `npm run lint`
- Push without running `npm run build`
- Ignore error messages - they show exactly what's wrong
- Skip the pre-commit validation steps

**✅ DO:**
- Always run both lint and build before committing
- Read and understand error messages
- Fix all errors before pushing
- Write clear, descriptive commit messages
- Test changes thoroughly before committing

---

**Remember: 5 minutes of validation saves 30 minutes of debugging!**

Last updated: After fixing parse error in GamePicker.jsx
