#!/bin/sh
#
# Pre-commit hook to enforce 250-line file size limit
#

echo "🔍 Checking file sizes before commit..."

# Run the file size monitor
node scripts/file-size-monitor.js --exit-on-violation

# Check the exit status
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ COMMIT BLOCKED: Files exceed 250-line limit!"
    echo "Please split large files before committing."
    echo "Run 'npm run check-file-sizes' for details."
    exit 1
fi

echo "✅ All files comply with 250-line limit."
exit 0
