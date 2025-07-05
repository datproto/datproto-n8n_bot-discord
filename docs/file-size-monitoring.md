# File Size Monitoring System

## Overview
This project enforces a **250-line maximum** for all source code files to maintain code quality, readability, and maintainability.

## File Size Limit Policy
- **Maximum lines per file**: 250 lines (HARD LIMIT)
- **Warning threshold**: 240 lines (proactive splitting recommended)
- **Scope**: All source code files (.js, .ts, .md, .txt, .yml, .yaml, etc.)
- **Exclusions**: Auto-generated files (package-lock.json, etc.)

## Monitoring Tools

### 1. File Size Monitor Script
**Location**: `scripts/file-size-monitor.js`

**Usage**:
```bash
# Basic check
node scripts/file-size-monitor.js

# Save detailed report
node scripts/file-size-monitor.js --save

# Exit with error code if violations found (for CI/CD)
node scripts/file-size-monitor.js --exit-on-violation
```

### 2. NPM Scripts
```bash
# Check file sizes and save report
npm run check-file-sizes

# Strict mode (exits with error if violations found)
npm run check-file-sizes-strict
```

### 3. Pre-commit Hook
**Location**: `scripts/pre-commit-hook.sh`

Automatically blocks commits when files exceed the 250-line limit.

**Installation**:
```bash
# Copy to .git/hooks/ (if using git)
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Reports
Detailed reports are saved to `.taskmaster/reports/file-size-report.json` and include:
- File line counts
- Violations (files over 250 lines)
- Warnings (files approaching limit)
- Compliance status

## File Splitting Guidelines

### When to Split
- **At 240 lines**: Start planning file split
- **At 250 lines**: MUST split immediately

### How to Split
1. **Identify logical boundaries**: Functions, classes, modules
2. **Create focused modules**: Single responsibility principle
3. **Maintain clear imports/exports**: Preserve dependencies
4. **Update documentation**: Reflect new structure

### Example Split Structure
```
Original: large-file.js (300+ lines)
↓
Split into:
├── utils/formatters.js (60 lines)
├── services/api-client.js (80 lines)
├── handlers/event-handler.js (75 lines)
└── main.js (50 lines)
```

## Benefits of File Size Limits
- ✅ **Improved readability**: Easier to understand code
- ✅ **Better maintainability**: Focused, single-purpose modules
- ✅ **Enhanced testability**: Smaller units are easier to test
- ✅ **Reduced merge conflicts**: Smaller files have fewer conflicts
- ✅ **Better code review**: Reviewers can focus on specific areas
- ✅ **Enforced modularity**: Natural separation of concerns

## Integration with CI/CD
Add file size checking to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Check File Sizes
  run: npm run check-file-sizes-strict
```

```bash
# Jenkins/other CI example
npm run check-file-sizes-strict
```

## Configuration
Edit `scripts/file-size-monitor.js` to customize:
- `MAX_LINES`: Maximum allowed lines (default: 250)
- `TRIGGER_THRESHOLD`: Warning threshold (default: 240)
- `EXCLUDED_DIRS`: Directories to skip
- `EXCLUDED_FILES`: Specific files to exclude
- `INCLUDED_EXTENSIONS`: File types to monitor

## Troubleshooting

### Common Issues
1. **Large auto-generated files**: Add to `EXCLUDED_FILES` array
2. **Legacy code violations**: Split incrementally during maintenance
3. **Third-party files**: Add to exclusion lists

### Quick Fixes
```bash
# See current violations
npm run check-file-sizes

# Check specific directory
node scripts/file-size-monitor.js /path/to/directory

# Generate report only (no console output)
node scripts/file-size-monitor.js --save > /dev/null
```

## Best Practices
1. **Monitor regularly**: Run checks before commits
2. **Split proactively**: Don't wait until 250 lines
3. **Maintain modularity**: Keep related code together
4. **Document splits**: Update README when restructuring
5. **Test after splitting**: Ensure functionality remains intact
