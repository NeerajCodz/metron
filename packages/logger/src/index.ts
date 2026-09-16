import type { TraceContext } from "@metron/types";
import pino, { type DestinationStream, type Logger, type LoggerOptions } from "pino";

const REDACTED_PATHS = [
  "authorization",
  "headers.authorization",
  "headers.cookie",
  "password",
  "privateKey",
  "secret",
  "token",
  "*.authorization",
  "*.password",
  "*.privateKey",
  "*.secret",
  "*.token",
];

export interface LoggerConfiguration {
  service: string;
  environment: string;
  level?: string;
  destination?: DestinationStream;
}

export function createServiceLogger(configuration: LoggerConfiguration): Logger {
  const options: LoggerOptions = {
    base: {
      service: configuration.service,
      environment: configuration.environment,
    },
    level: configuration.level ?? "info",
    messageKey: "message",
    redact: {
      paths: REDACTED_PATHS,
      censor: "[REDACTED]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  return pino(options, configuration.destination);
}

export function withTrace(logger: Logger, context: TraceContext): Logger {
  return logger.child({
    traceId: context.traceId,
    ...(context.intentId === undefined ? {} : { intentId: context.intentId }),
    ...(context.positionId === undefined ? {} : { positionId: context.positionId }),
    ...(context.chainId === undefined ? {} : { chainId: context.chainId }),
  });
}
