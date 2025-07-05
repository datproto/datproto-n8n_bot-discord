# Modular Structure Plan - Discord N8N Bot

## Overview
This document outlines the modular refactoring plan to split the monolithic `index.js` (391 lines) into smaller, focused modules that comply with the 250-line limit.

## Original File Analysis
**index.js - 391 lines total**
- Lines 1-30: Imports and Discord client configuration
- Lines 31-55: Utility formatting functions (formatUser, formatChannel, formatGuild, formatMessage, formatReaction)
- Lines 56-80: Content type detection functions (getContentType)
- Lines 81-110: N8N communication functions (sendToN8n)
- Lines 111-185: Event data creation functions (createEventData - complex unified structure)
- Lines 186-220: Message handlers (messageCreate event)
- Lines 221-260: Reaction handlers (handleReaction function + listeners)
- Lines 261-340: Thread event handlers (6 different thread events)
- Lines 341-391: Command registration and client startup

## Proposed Modular Structure

### 1. lib/formatters.js (~40 lines)
**Responsibility**: Data formatting utilities
**Content**:
- formatUser(), formatChannel(), formatGuild(), formatMessage(), formatReaction()
- getContentType() function
- Pure utility functions with no external dependencies

### 2. lib/n8n-service.js (~35 lines)
**Responsibility**: N8N communication interface
**Content**:
- sendToN8n() function
- Environment variable handling for N8N_WEBHOOK_URL
- Error handling for webhook communication
- Logging for N8N operations

### 3. lib/event-data.js (~80 lines)
**Responsibility**: Event data structure creation
**Content**:
- createEventData() function (the complex unified data structure creator)
- Event-specific data transformation logic
- Thread/reaction/message data aggregation

### 4. lib/event-handlers/message-handler.js (~45 lines)
**Responsibility**: Message event processing
**Content**:
- messageCreate event handler
- Thread message detection and routing
- Integration with event-data and n8n-service modules

### 5. lib/event-handlers/reaction-handler.js (~50 lines)
**Responsibility**: Reaction event processing
**Content**:
- handleReaction() function
- messageReactionAdd/messageReactionRemove event handlers
- Partial data fetching for reactions

### 6. lib/event-handlers/thread-handler.js (~85 lines)
**Responsibility**: Thread event management
**Content**:
- threadCreate, threadDelete, threadUpdate handlers
- threadMemberAdd, threadMemberRemove handlers
- Thread change detection and diff logic

### 7. lib/commands.js (~35 lines)
**Responsibility**: Command registration and interaction handling
**Content**:
- Command collection management
- interactionCreate event handler
- Error handling for command execution
- Dynamic command registration from commands/ directory

### 8. index.js (New main file ~40 lines)
**Responsibility**: Application bootstrap and coordination
**Content**:
- Environment configuration loading
- Discord client instantiation with intents
- Module imports and event handler registration
- Client login and graceful shutdown
- Process signal handling

## Module Dependencies

```
index.js (main)
├── lib/formatters.js (pure utilities)
├── lib/n8n-service.js (external communication)
├── lib/event-data.js (depends on formatters)
├── lib/commands.js (depends on commands/ directory)
└── lib/event-handlers/
    ├── message-handler.js (depends on event-data, n8n-service)
    ├── reaction-handler.js (depends on event-data, n8n-service)
    └── thread-handler.js (depends on event-data, n8n-service)
```

## File Size Compliance
- All proposed modules are designed to stay well under 250 lines
- Largest module (thread-handler.js) estimated at 85 lines
- Total lines maintained while improving maintainability
- Clear separation of concerns achieved

## Import/Export Strategy
- Use ES6 module syntax (require/module.exports for Node.js compatibility)
- Each module exports only its public interface
- Minimize circular dependencies
- Clear dependency hierarchy

## Testing Strategy
- Each module can be unit tested independently
- Mock external dependencies (Discord.js, axios)
- Verify that refactored functionality matches original behavior
- Integration tests for event flow

## Migration Plan
1. Create all module files with proper structure
2. Move code incrementally while maintaining functionality
3. Update imports and exports
4. Test each module as it's created
5. Final integration testing
6. Remove original monolithic index.js

## Benefits
- ✅ Complies with 250-line limit requirement
- ✅ Improved maintainability and readability
- ✅ Better testability with isolated modules
- ✅ Clear separation of concerns
- ✅ Easier to extend with new features
- ✅ Reduces risk of merge conflicts in team development
