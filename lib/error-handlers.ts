// Global error handlers to prevent process crashes
// This should be imported early in the application

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Don't exit the process - let the job fail gracefully
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process
});


export function reportError(error: Error, metadata: Record<string, any> = {}) {
    console.error(`🚨 Error reported [${metadata.context || 'Unknown'}]:`, error.message);
    if (Object.keys(metadata).length > 0) {
        console.error('Metadata:', metadata);
    }
}

