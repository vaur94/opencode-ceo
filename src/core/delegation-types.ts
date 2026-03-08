export interface DelegationRequest {
  targetAgent: string;
  prompt: string;
  tools: Record<string, boolean>;
  timeout: number;
}

export interface DelegationResult {
  success: boolean;
  output: string;
  sessionID: string;
  error?: string;
}
