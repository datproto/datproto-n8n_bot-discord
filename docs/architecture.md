# Architecture Guide

## Overview
This Discord N8N Bot follows a modular architecture designed for maintainability, testability, and scalability.

## Design Principles

### 1. File Size Limit Enforcement
- **250-line maximum** for all source files
- **240-line warning threshold** for proactive splitting
- Automated monitoring and CI/CD integration

### 2. Modular Structure
Every module has a single responsibility and clear interface:

```
lib/
├── formatters.js       # Pure utility functions for data formatting
├── n8n-service.js      # External API communication (N8N webhooks)
├── event-data.js       # Event data structure creation and transformation
├── commands.js         # Discord command registration and handling
└── event-handlers/     # Event-specific processing modules
    ├── message-handler.js   # Discord message events
    ├── reaction-handler.js  # Message reaction events  
    └── thread-handler.js    # Thread-related events
```

### 3. Dependency Hierarchy
Clear dependency flow prevents circular dependencies:
```
index.js (main)
├── lib/formatters.js (pure utilities)
├── lib/n8n-service.js (external communication)
├── lib/event-data.js (depends on formatters)
├── lib/commands.js (depends on commands/ directory)
└── lib/event-handlers/ (depend on event-data, n8n-service)
```

## Module Details

### Core Modules

**`lib/formatters.js`** (96 lines)
- Pure utility functions
- No external dependencies
- Data transformation for Discord objects

**`lib/n8n-service.js`** (38 lines)  
- N8N webhook communication
- Error handling for external API calls
- Logging and debugging

**`lib/event-data.js`** (108 lines)
- Unified event data structure creation
- Handles complex event types (threads, reactions, messages)
- Data aggregation and transformation

### Event Handlers

**`lib/event-handlers/message-handler.js`** (39 lines)
- Discord message creation events
- Thread message detection
- Bot message filtering

**`lib/event-handlers/reaction-handler.js`** (67 lines)
- Message reaction add/remove events
- Partial data fetching
- Thread reaction handling

**`lib/event-handlers/thread-handler.js`** (131 lines)
- Thread lifecycle events (create, delete, update)
- Thread member management
- Change detection and diff logic

### Application Infrastructure

**`lib/commands.js`** (63 lines)
- Slash command registration
- Interaction handling
- Error management for commands

**`index.js`** (69 lines)
- Application bootstrap
- Discord client configuration
- Event handler registration
- Graceful shutdown handling

## Benefits of This Architecture

### Maintainability
- **Small, focused files** are easier to understand
- **Single responsibility** makes changes predictable
- **Clear interfaces** between modules

### Testability  
- **Isolated modules** can be unit tested independently
- **Minimal dependencies** make mocking easier
- **Pure functions** are deterministic and reliable

### Scalability
- **Modular design** allows easy feature addition
- **Clear separation** prevents feature interference
- **File size limits** prevent modules from growing unwieldy

### Developer Experience
- **Easy navigation** through small, focused files
- **Reduced merge conflicts** with smaller change surfaces
- **Clear documentation** for each module's purpose

## File Size Monitoring

Automated tools ensure architecture compliance:

### Monitoring Script
```bash
# Check compliance
npm run check-file-sizes

# Report generation
node scripts/file-size-monitor.js --save
```

### Pre-commit Integration
```bash
# Install git hook
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Check File Sizes
  run: npm run check-file-sizes-strict
```

## Extension Guidelines

When adding new features:

1. **Create focused modules** under 250 lines
2. **Follow dependency hierarchy** 
3. **Write unit tests** for new modules
4. **Update documentation** for architectural changes
5. **Run compliance checks** before committing

## Migration from Monolithic Design

Original `index.js` (391 lines) was split into 8 focused modules:
- **69% reduction** in main file size (391 → 69 lines)
- **Improved maintainability** through separation of concerns
- **Better testability** with isolated, focused modules
- **Enhanced readability** with clear module boundaries
