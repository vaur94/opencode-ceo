import type { ArtifactEntry } from "../state/artifact-types.js";
import type { PipelineRun } from "../state/types.js";

export interface DecisionEntry {
	id: string;
	pipeline_id: string;
	stage: string;
	decision: string;
	reasoning: string;
	created_at: string;
}

function formatArtifacts(artifacts: ArtifactEntry[]): string {
	if (artifacts.length === 0) {
		return "- None";
	}

	return artifacts
		.map((artifact) => `- **${artifact.type}** (${artifact.stage})`)
		.join("\n");
}

function formatDecisions(decisions: DecisionEntry[]): string {
	if (decisions.length === 0) {
		return "- None";
	}

	return decisions
		.map((decision) => {
			const reasoning =
				decision.reasoning.trim().length > 0
					? decision.reasoning
					: "No reasoning provided";

			return `- **${decision.stage}**: ${decision.decision}\n  - Reasoning: ${reasoning}`;
		})
		.join("\n");
}

export function formatPRBody(
	pipeline: PipelineRun,
	artifacts: ArtifactEntry[],
	decisions: DecisionEntry[],
): string {
	return [
		"## 🎯 Goal",
		pipeline.goal,
		"",
		"## 📊 Pipeline Summary",
		`- **Status**: ${pipeline.state}`,
		`- **Pipeline ID**: ${pipeline.id}`,
		`- **Started**: ${String(pipeline.created_at)}`,
		"",
		"## 📦 Artifacts",
		formatArtifacts(artifacts),
		"",
		"## 🧠 Decisions Made",
		formatDecisions(decisions),
	].join("\n");
}
