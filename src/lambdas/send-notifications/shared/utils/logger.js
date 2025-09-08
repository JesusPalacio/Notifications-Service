class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  formatMessage(level, message, extra = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(extra && { extra })
    };

    return JSON.stringify(logEntry);
  }

  info(message, extra = null) {
    console.log(this.formatMessage('info', message, extra));
  }

  error(message, error = null) {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : null;
    
    console.error(this.formatMessage('error', message, errorInfo));
  }

  warn(message, extra = null) {
    console.warn(this.formatMessage('warn', message, extra));
  }

  debug(message, extra = null) {
    if (this.logLevel === 'debug') {
      console.debug(this.formatMessage('debug', message, extra));
    }
  }
}

module.exports = new Logger();