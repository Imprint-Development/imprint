export interface AnalysisRow {
  studentName: string;
  repoId: string;
  repoUrl: string;
  codeMetrics: Record<string, number>;
  testMetrics: Record<string, number>;
  reviewMetrics: Record<string, number>;
}

export interface RepoWarning {
  repoId: string;
  repoUrl: string;
  unidentifiedAuthors: string[];
}

export interface ReviewWarning {
  repoId: string;
  repoUrl: string;
  message: string;
}
