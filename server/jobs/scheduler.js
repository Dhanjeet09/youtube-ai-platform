/**
 * Scheduler entry point.
 * This module initialises the scheduler when imported.
 * It re-exports from the main scheduler service for convenience.
 */
export { startScheduler, getStatus, toggle } from "../scheduler/schedulerService.js"
