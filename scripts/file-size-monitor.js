#!/usr/bin/env node

/**
 * File Size Monitor
 * Enforces 250-line limit across all project files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MAX_LINES = 250;
const TRIGGER_THRESHOLD = 240; // Start warning at 240 lines
const EXCLUDED_DIRS = ['node_modules', '.git', '.taskmaster/reports'];
const EXCLUDED_FILES = ['package-lock.json']; // Auto-generated files to exclude
const INCLUDED_EXTENSIONS = ['.js', '.ts', '.json', '.md', '.txt', '.yml', '.yaml', '.py', '.java', '.c', '.cpp', '.h'];

/**
 * Get all files in directory recursively
 * @param {string} dir - Directory to search
 * @param {string[]} files - Array to collect files
 * @returns {string[]} Array of file paths
 */
function getAllFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Skip excluded directories
            if (!EXCLUDED_DIRS.some(excluded => fullPath.includes(excluded))) {
                getAllFiles(fullPath, files);
            }
        } else {
            // Include only specified file extensions and exclude specific files
            const ext = path.extname(fullPath);
            const fileName = path.basename(fullPath);
            if (INCLUDED_EXTENSIONS.includes(ext) && !EXCLUDED_FILES.includes(fileName)) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

/**
 * Count lines in a file
 * @param {string} filePath - Path to file
 * @returns {number} Number of lines
 */
function countLines(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split('\n').length;
    } catch (error) {
        console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
        return 0;
    }
}

/**
 * Generate file size report
 * @param {string} projectRoot - Root directory of project
 * @returns {Object} Report object with violations and warnings
 */
function generateReport(projectRoot) {
    const files = getAllFiles(projectRoot);
    const violations = [];
    const warnings = [];
    const compliant = [];
    
    for (const filePath of files) {
        const lineCount = countLines(filePath);
        const relativePath = path.relative(projectRoot, filePath);
        
        const fileInfo = {
            path: relativePath,
            lines: lineCount,
            overLimit: lineCount - MAX_LINES,
            nearLimit: MAX_LINES - lineCount
        };
        
        if (lineCount > MAX_LINES) {
            violations.push(fileInfo);
        } else if (lineCount >= TRIGGER_THRESHOLD) {
            warnings.push(fileInfo);
        } else {
            compliant.push(fileInfo);
        }
    }
    
    return {
        violations: violations.sort((a, b) => b.lines - a.lines),
        warnings: warnings.sort((a, b) => b.lines - a.lines),
        compliant: compliant.sort((a, b) => b.lines - a.lines),
        summary: {
            totalFiles: files.length,
            violationCount: violations.length,
            warningCount: warnings.length,
            compliantCount: compliant.length
        }
    };
}

/**
 * Display report in console
 * @param {Object} report - Report object from generateReport
 */
function displayReport(report) {
    console.log('\n🔍 FILE SIZE MONITORING REPORT');
    console.log('=' .repeat(50));
    
    // Summary
    console.log(`\n📊 SUMMARY:`);
    console.log(`Total Files: ${report.summary.totalFiles}`);
    console.log(`Violations (>${MAX_LINES} lines): ${report.summary.violationCount}`);
    console.log(`Warnings (>=${TRIGGER_THRESHOLD} lines): ${report.summary.warningCount}`);
    console.log(`Compliant: ${report.summary.compliantCount}`);
    
    // Violations
    if (report.violations.length > 0) {
        console.log(`\n❌ VIOLATIONS (Files exceeding ${MAX_LINES} lines):`);
        for (const file of report.violations) {
            console.log(`  ${file.path}: ${file.lines} lines (+${file.overLimit} over limit)`);
        }
    }
    
    // Warnings
    if (report.warnings.length > 0) {
        console.log(`\n⚠️  WARNINGS (Files approaching ${MAX_LINES} line limit):`);
        for (const file of report.warnings) {
            console.log(`  ${file.path}: ${file.lines} lines (${file.nearLimit} lines remaining)`);
        }
    }
    
    // Status
    if (report.violations.length === 0) {
        console.log(`\n✅ ALL FILES COMPLY WITH ${MAX_LINES}-LINE LIMIT!`);
    } else {
        console.log(`\n🚨 ${report.violations.length} FILE(S) EXCEED THE ${MAX_LINES}-LINE LIMIT!`);
    }
    
    console.log('\n');
}

/**
 * Save report to JSON file
 * @param {Object} report - Report object
 * @param {string} outputPath - Path to save report
 */
function saveReport(report, outputPath) {
    const reportData = {
        timestamp: new Date().toISOString(),
        maxLines: MAX_LINES,
        triggerThreshold: TRIGGER_THRESHOLD,
        ...report
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 Report saved to: ${outputPath}`);
}

/**
 * Main execution function
 */
function main() {
    const args = process.argv.slice(2);
    const shouldSaveReport = args.includes('--save') || args.includes('-s');
    const exitOnViolation = args.includes('--exit-on-violation') || args.includes('-e');
    
    // Find project root (first argument that's not a flag)
    const projectRoot = args.find(arg => !arg.startsWith('-')) || process.cwd();
    
    console.log(`Monitoring files in: ${projectRoot}`);
    
    // Generate and display report
    const report = generateReport(projectRoot);
    displayReport(report);
    
    // Save report if requested
    if (shouldSaveReport) {
        const reportDir = path.join(projectRoot, '.taskmaster', 'reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        const reportPath = path.join(reportDir, 'file-size-report.json');
        saveReport(report, reportPath);
    }
    
    // Exit with error code if violations found and exit flag is set
    if (exitOnViolation && report.violations.length > 0) {
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    generateReport,
    displayReport,
    saveReport,
    MAX_LINES,
    TRIGGER_THRESHOLD
};
