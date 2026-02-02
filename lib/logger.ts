// lib/logger.ts
import { supabase } from './supabase/client';

export type LogType = 'cron' | 'api' | 'email' | 'auth' | 'db' | 'system' | 'order' | 'product' | 'user' | 'ui' | 'cart' | 'export' | 'navigation' | 'validation' | 'win' | 'storage';
export type LogLevel = 'info' | 'warning' | 'error' | 'success';
export type LogStatus = 'sent' | 'skipped' | 'failed' | 'completed' | 'pending' | 'processing';

export interface LogData {
    type: LogType;
    level: LogLevel;
    action: string;
    message: string;
    userId?: string | null;
    productId?: string | null;
    filterId?: string | null;
    orderId?: string | null;
    waitlistId?: string | null;
    winId?: string | null;
    cartId?: string | null;
    details?: Record<string, any>;
    status?: LogStatus;
    environment?: string;
    executionTimeMs?: number;
    source?: string; // Add this for page URL
}

export interface LoggerOptions {
    autoTimestamp?: boolean;
    defaultEnvironment?: string;
    defaultDev?: string;
    autoSource?: boolean; // Add this option
}

class Logger {
    private options: LoggerOptions;

    constructor(options: LoggerOptions = {}) {
        this.options = {
            autoTimestamp: true,
            defaultEnvironment: process.env.NODE_ENV || 'development',
            defaultDev: 'system',
            autoSource: true, // Default to true
            ...options
        };
    }

    private getCurrentSource(): string | null {
        if (typeof window === 'undefined') {
            return null; // Server-side
        }
        
        try {
            // Get full URL
            const url = window.location.href;
            // Get pathname only (without domain)
            const pathname = window.location.pathname;
            // Get full URL with query params
            const fullUrl = window.location.href;
            
            // You can return whichever format you prefer:
            return fullUrl; // Returns full URL with domain
            // OR return pathname; // Returns only path like "/register"
            // OR return url; // Returns URL without protocol
            
        } catch (error) {
            return null;
        }
    }

    async log(logData: LogData) {
        const startTime = Date.now();

        try {
            const logEntry: any = {
                type: logData.type,
                level: logData.level,
                action: logData.action,
                message: logData.message,
                user_id: logData.userId || null,
                product_id: logData.productId || null,
                filter_id: logData.filterId || null,
                order_id: logData.orderId || null,
                waitlist_id: logData.waitlistId || null,
                win_id: logData.winId || null,
                cart_id: logData.cartId || null,
                details: logData.details || {},
                status: logData.status || 'completed',
                environment: logData.environment || this.options.defaultEnvironment,
                execution_time_ms: logData.executionTimeMs || null,
                source: logData.source || (this.options.autoSource ? this.getCurrentSource() : null) // Auto-populate source
            };

            if (this.options.autoTimestamp) {
                logEntry.created_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('logs')
                .insert(logEntry);

            if (error) {
                return {
                    success: false,
                    error: error.message,
                    executionTimeMs: Date.now() - startTime
                };
            }

            return {
                success: true,
                data: logEntry,
                executionTimeMs: Date.now() - startTime
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                executionTimeMs: Date.now() - startTime
            };
        }
    }

    // Update all helper methods to include source parameter
    async auth(
        action: string,
        message: string,
        userId?: string,
        details?: Record<string, any>,
        status?: LogStatus,
        source?: string
    ) {
        return this.log({
            type: 'auth',
            level: 'info',
            action,
            message,
            userId,
            details,
            status,
            source
        });
    }

    async error(
        type: LogType,
        action: string,
        message: string,
        errorDetails?: any,
        userId?: string,
        source?: string
    ) {
        return this.log({
            type,
            level: 'error',
            action,
            message,
            userId,
            details: {
                error: errorDetails?.message || errorDetails,
                stack: errorDetails?.stack,
                code: errorDetails?.code,
                ...(typeof errorDetails === 'object' ? errorDetails : {})
            },
            status: 'failed',
            source
        });
    }

    async success(
        type: LogType,
        action: string,
        message: string,
        details?: Record<string, any>,
        userId?: string,
        source?: string
    ) {
        return this.log({
            type,
            level: 'success',
            action,
            message,
            userId,
            details,
            status: 'completed',
            source
        });
    }

    async warning(
        type: LogType,
        action: string,
        message: string,
        details?: Record<string, any>,
        userId?: string,
        source?: string
    ) {
        return this.log({
            type,
            level: 'warning',
            action,
            message,
            userId,
            details,
            status: 'completed',
            source
        });
    }

    async info(
        type: LogType,
        action: string,
        message: string,
        details?: Record<string, any>,
        userId?: string,
        source?: string
    ) {
        return this.log({
            type,
            level: 'info',
            action,
            message,
            userId,
            details,
            status: 'completed',
            source
        });
    }

    // Other helper methods with source parameter...
    async email(action: string, message: string, userId?: string, details?: Record<string, any>, status?: LogStatus, source?: string) {
        return this.log({
            type: 'email',
            level: 'info',
            action,
            message,
            userId,
            details,
            status,
            source
        });
    }

    async db(action: string, message: string, userId?: string, details?: Record<string, any>, status?: LogStatus, source?: string) {
        return this.log({
            type: 'db',
            level: 'info',
            action,
            message,
            userId,
            details,
            status,
            source
        });
    }
}

// Create default logger instance
export const logger = new Logger();

// Also export individual helper functions for convenience
export const logActivity = logger.log.bind(logger);
export const logAuth = logger.auth.bind(logger);
export const logError = logger.error.bind(logger);
export const logSuccess = logger.success.bind(logger);
export const logWarning = logger.warning.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logEmail = logger.email.bind(logger);
export const logDb = logger.db.bind(logger);

// Quick logging functions
export const quickLog = (
    type: LogType,
    level: LogLevel,
    action: string,
    message: string,
    options?: {
        userId?: string;
        details?: Record<string, any>;
        status?: LogStatus;
        source?: string;
    }
) => {
    return logger.log({
        type,
        level,
        action,
        message,
        userId: options?.userId,
        details: options?.details,
        status: options?.status,
        source: options?.source
    });
};

// Special helper for Next.js server components/pages
export const logWithPath = async (
    type: LogType,
    level: LogLevel,
    action: string,
    message: string,
    path: string, // Manually pass path in server components
    options?: {
        userId?: string;
        details?: Record<string, any>;
        status?: LogStatus;
    }
) => {
    return logger.log({
        type,
        level,
        action,
        message,
        userId: options?.userId,
        details: options?.details,
        status: options?.status,
        source: path
    });
};