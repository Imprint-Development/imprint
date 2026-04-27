export const PIPELINE_REGISTRY = [
  { id: "contributions", label: "Contributions" },
] as const;

export type PipelineId = (typeof PIPELINE_REGISTRY)[number]["id"];

export const ALL_PIPELINE_IDS: string[] = PIPELINE_REGISTRY.map((p) => p.id);
