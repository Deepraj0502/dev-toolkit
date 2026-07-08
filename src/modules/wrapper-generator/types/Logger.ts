export type LogLevel = "info" | "success" | "error" | "warning";

export interface LoggerMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
}
