/**
 * @typedef {("silent" | "error" | "warn" | "info" | "debug")} LogLevel
 */

export const LogLevel = {
  SILENT: "silent",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

const LogPriority = {
  [LogLevel.SILENT]: 0,
  [LogLevel.ERROR]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.INFO]: 3,
  [LogLevel.DEBUG]: 4,
};

/**
 * Level-based console logger.
 */
export class Logger {
  #level;

  /**
   * @param {LogLevel} [level=LogLevel.SILENT] - Active log level.
   */
  constructor(level = LogLevel.SILENT) {
    if (!(level in LogPriority)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    this.#level = level;
  }

  /**
   * @param {LogLevel} level - Required level.
   * @returns {boolean}
   */
  #allows(level) {
    return LogPriority[this.#level] >= LogPriority[level];
  }

  /**
   * @param {...any} values - Values to log.
   */
  error(...values) {
    if (!this.#allows(LogLevel.ERROR)) return;
    console.error(...values);
  }

  /**
   * @param {...any} values - Values to log.
   */
  warn(...values) {
    if (!this.#allows(LogLevel.WARN)) return;
    console.warn(...values);
  }

  /**
   * @param {...any} values - Values to log.
   */
  info(...values) {
    if (!this.#allows(LogLevel.INFO)) return;
    console.info(...values);
  }

  /**
   * @param {...any} values - Values to log.
   */
  debug(...values) {
    if (!this.#allows(LogLevel.DEBUG)) return;
    console.debug(...values);
  }

  /**
   * @param {...any} values - Values to log.
   */
  group(...values) {
    if (!this.#allows(LogLevel.DEBUG)) return;
    console.group(...values);
  }

  /**
   * @param {...any} values - Values to log.
   */
  table(...values) {
    if (!this.#allows(LogLevel.DEBUG)) return;
    console.table(...values);
  }

  groupEnd() {
    if (!this.#allows(LogLevel.DEBUG)) return;
    console.groupEnd();
  }
}
