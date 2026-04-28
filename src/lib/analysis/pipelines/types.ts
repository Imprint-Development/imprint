export type LogLevel = "info" | "warn" | "error";

export type PipelineLogger = (
  level: LogLevel,
  message: string,
  repositoryId?: string
) => Promise<void>;

export interface CheckpointRecord {
  id: string;
  gitRef: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

export interface GroupRecord {
  id: string;
  name: string;
}

export interface PipelineContext {
  checkpoint: CheckpointRecord;
  group: GroupRecord;
  ignoredEmails: Set<string>;
  ignoredGithubUsernames: Set<string>;
  log: PipelineLogger;
}
