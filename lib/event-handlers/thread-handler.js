/**
 * Thread Event Handler Module
 * Handles Discord thread-related events
 */

const { createEventData } = require('../event-data');
const { sendToN8n } = require('../n8n-service');

/**
 * Handle thread creation events
 * @param {Object} thread - Discord thread object
 * @returns {Promise<void>} Promise that resolves when thread creation is processed
 */
const handleThreadCreate = async (thread) => {
    try {
        const threadData = createEventData(thread, 'thread_create', { isThreadEvent: true });
        await sendToN8n(threadData, 'thread_create');
    } catch (error) {
        console.error('Error processing thread creation:', error);
    }
};

/**
 * Handle thread deletion events
 * @param {Object} thread - Discord thread object
 * @returns {Promise<void>} Promise that resolves when thread deletion is processed
 */
const handleThreadDelete = async (thread) => {
    try {
        const threadData = createEventData(thread, 'thread_delete', { isThreadEvent: true });
        await sendToN8n(threadData, 'thread_delete');
    } catch (error) {
        console.error('Error processing thread deletion:', error);
    }
};

/**
 * Handle thread update events
 * @param {Object} oldThread - Previous thread state
 * @param {Object} newThread - Updated thread state
 * @returns {Promise<void>} Promise that resolves when thread update is processed
 */
const handleThreadUpdate = async (oldThread, newThread) => {
    try {
        const changes = {
            name: oldThread.name !== newThread.name ? {
                old: oldThread.name,
                new: newThread.name
            } : null,
            archived: oldThread.archived !== newThread.archived ? {
                old: oldThread.archived,
                new: newThread.archived
            } : null,
            locked: oldThread.locked !== newThread.locked ? {
                old: oldThread.locked,
                new: newThread.locked
            } : null,
            auto_archive_duration: oldThread.autoArchiveDuration !== newThread.autoArchiveDuration ? {
                old: oldThread.autoArchiveDuration,
                new: newThread.autoArchiveDuration
            } : null,
            rate_limit_per_user: oldThread.rateLimitPerUser !== newThread.rateLimitPerUser ? {
                old: oldThread.rateLimitPerUser,
                new: newThread.rateLimitPerUser
            } : null
        };

        const threadData = createEventData(newThread, 'thread_update', {
            isThreadEvent: true,
            changes
        });
        await sendToN8n(threadData, 'thread_update');
    } catch (error) {
        console.error('Error processing thread update:', error);
    }
};

/**
 * Handle thread member join events
 * @param {Object} member - Discord thread member object
 * @returns {Promise<void>} Promise that resolves when member join is processed
 */
const handleThreadMemberAdd = async (member) => {
    try {
        const threadData = createEventData(member.thread, 'thread_member_join', {
            isThreadEvent: true,
            author: member.user
        });
        await sendToN8n(threadData, 'thread_member_join');
    } catch (error) {
        console.error('Error processing thread member join:', error);
    }
};

/**
 * Handle thread member leave events
 * @param {Object} member - Discord thread member object
 * @returns {Promise<void>} Promise that resolves when member leave is processed
 */
const handleThreadMemberRemove = async (member) => {
    try {
        const threadData = createEventData(member.thread, 'thread_member_leave', {
            isThreadEvent: true,
            author: member.user
        });
        await sendToN8n(threadData, 'thread_member_leave');
    } catch (error) {
        console.error('Error processing thread member leave:', error);
    }
};

/**
 * Register thread event handlers with Discord client
 * @param {Object} client - Discord client instance
 */
const registerThreadHandlers = (client) => {
    client.on('threadCreate', handleThreadCreate);
    client.on('threadDelete', handleThreadDelete);
    client.on('threadUpdate', handleThreadUpdate);
    client.on('threadMemberAdd', handleThreadMemberAdd);
    client.on('threadMemberRemove', handleThreadMemberRemove);
};

module.exports = {
    handleThreadCreate,
    handleThreadDelete,
    handleThreadUpdate,
    handleThreadMemberAdd,
    handleThreadMemberRemove,
    registerThreadHandlers
};
