export const logger = {
    info: (message: string) => {
        console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString() }, null, 2));
    },
    warn: (message: string) => {
        console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString() }, null, 2));
    },
    error: (message: string) => {
        console.error(JSON.stringify({ level: 'error', message, timestamp: new Date().toISOString() }, null, 2));
    }
}