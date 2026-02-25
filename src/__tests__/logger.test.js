import { afterEach, describe, expect, it, vi } from "vitest";
import { LogLevel, Logger } from "../__utils__/logger.js";

describe("Logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should suppress all logs when set to silent", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const group = vi.spyOn(console, "group").mockImplementation(() => {});
    const table = vi.spyOn(console, "table").mockImplementation(() => {});
    const groupEnd = vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    const logger = new Logger(LogLevel.SILENT);
    logger.error("error");
    logger.warn("warn");
    logger.info("info");
    logger.debug("debug");
    logger.group("group");
    logger.table([{ row: 1 }]);
    logger.groupEnd();

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(debug).not.toHaveBeenCalled();
    expect(group).not.toHaveBeenCalled();
    expect(table).not.toHaveBeenCalled();
    expect(groupEnd).not.toHaveBeenCalled();
  });

  it("should log info, warn, and error when set to info", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const group = vi.spyOn(console, "group").mockImplementation(() => {});
    const table = vi.spyOn(console, "table").mockImplementation(() => {});

    const logger = new Logger(LogLevel.INFO);
    logger.error("error");
    logger.warn("warn");
    logger.info("info");
    logger.debug("debug");
    logger.group("group");
    logger.table([{ row: 1 }]);

    expect(error).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(1);
    expect(debug).not.toHaveBeenCalled();
    expect(group).not.toHaveBeenCalled();
    expect(table).not.toHaveBeenCalled();
  });

  it("should log debug output when set to debug", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const group = vi.spyOn(console, "group").mockImplementation(() => {});
    const table = vi.spyOn(console, "table").mockImplementation(() => {});
    const groupEnd = vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    const logger = new Logger(LogLevel.DEBUG);
    logger.debug("debug");
    logger.group("group");
    logger.table([{ row: 1 }]);
    logger.groupEnd();

    expect(debug).toHaveBeenCalledTimes(1);
    expect(group).toHaveBeenCalledTimes(1);
    expect(table).toHaveBeenCalledTimes(1);
    expect(groupEnd).toHaveBeenCalledTimes(1);
  });

  it("should throw for invalid log levels", () => {
    expect(() => new Logger("verbose")).toThrow("Invalid log level: verbose");
  });
});
