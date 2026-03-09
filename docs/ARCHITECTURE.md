# Architecture

This document describes the internal design and operational mechanics of the `opencode-ceo` plugin.

## Table of Contents

- [System Overview](#system-overview)
- [FSM States](#fsm-states)
- [Agent Contracts](#agent-contracts)
- [Tool Catalog](#tool-catalog)
- [State Schema](#state-schema)
- [Compaction Survival](#compaction-survival)

## System Overview

The `opencode-ceo` plugin implements a hierarchical agent model where a primary "CEO" agent manages the entire software delivery lifecycle by delegating specialized tasks to a fleet of subagents.

```
                      +-------------------+
                      |   OpenCode Host   |
                      +---------+---------+
                                |
                      +---------v---------+
                      |     CEO Agent     | (Pipeline Owner)
                      +----+---------+----+
                           |         |
           +---------------+         +---------------+
           |               |         |               |
  +--------v--------+ +----v----+ +--v---+ +---------v---------+
  | ceo-architect   | | ...     | | ...  | | Language Specialists|
  +-----------------+ +---------+ +------+ +-------------------+
           |               |         |               |
           +---------------+---------+---------------+
                                |
                      +---------v---------+
                      | Delivery Pipeline | (FSM Driven)
                      +---------+---------+
                                |
                [Intake] -> [Decompose] -> [Implement]
                                |
                [Deliver] <- [Test] <- [Review]
```

## FSM States

The delivery pipeline is governed by a Finite State Machine (FSM). Every task must progress through these states in a deterministic order.

| State | Purpose | Valid Next States |
|-------|---------|-------------------|
| `intake` | Initial analysis and feasibility check. | `decompose`, `failed` |
| `decompose` | Breaking work into implementation-ready plans. | `implement`, `blocked`, `failed` |
| `implement` | Writing code and performing local verification. | `review`, `implement`, `blocked`, `failed` |
| `review` | Peer review of changes for risk and standards. | `test`, `implement`, `failed` |
| `test` | Running focused validation and safety checks. | `deliver`, `implement`, `failed` |
| `deliver` | Final packaging and submission (e.g., Pull Request). | `completed`, `failed` |
| `completed` | Task successfully delivered. | (Terminal) |
| `failed` | Task failed or aborted. | (Terminal) |
| `blocked` | Task waiting for external resolution. | `intake`, `decompose`, `implement`, `review`, `test`, `deliver`, `failed` |
| `interrupted` | Pipeline execution paused or manually stopped. | `intake`, `decompose`, `implement`, `review`, `test`, `deliver` |

## Agent Contracts

Agents are bound by strict contracts that define their purpose, allowed tools, and required artifacts.

| Agent ID | Mode | Purpose | Input | Output |
|----------|------|---------|-------|--------|
| `ceo` | Primary | Pipeline ownership and delegation. | `task-brief` | `delivery-decision` |
| `ceo-architect` | Subagent | Work decomposition and planning. | `task-brief` | `implementation-plan` |
| `ceo-implementer` | Subagent | Code implementation and local verification. | `implementation-plan` | `code-change` |
| `ceo-reviewer` | Subagent | Quality and risk assessment. | `code-change` | `review-findings` |
| `ceo-tester` | Subagent | Safety and validation checks. | `code-change` | `test-report` |
| `ceo-ts-specialist` | Subagent | TypeScript-specific implementation. | `typed-change-request` | `typed-code-change` |
| `ceo-python-specialist` | Subagent | Python-specific implementation. | `python-change-request` | `python-code-change` |
| `ceo-go-specialist` | Subagent | Go-specific implementation. | `go-change-request` | `go-code-change` |

## Tool Catalog

The plugin provides 14 specialized tools namespaced with `ceo_`.

| Tool | Description |
|------|-------------|
| `ceo_delegate` | Spawns a subagent session for a specialized task. |
| `ceo_stage_transition` | Advances the pipeline to the next valid state. |
| `ceo_gate_run` | Triggers a validation gate (e.g., plan approval). |
| `ceo_gate_status` | Checks the status of a requested gate. |
| `ceo_artifact_write` | Persists a stage artifact (e.g., code diff, test report). |
| `ceo_artifact_read` | Retrieves a previously persisted artifact. |
| `ceo_decision_log` | Records a critical decision in the pipeline history. |
| `ceo_branch_prepare` | Creates or prepares a feature branch for work. |
| `ceo_pr_prepare` | Drafts or creates a Pull Request for delivery. |
| `ceo_repo_fingerprint` | Analyzes the repository structure and history. |
| `ceo_stack_detect` | Identifies languages, frameworks, and build tools. |
| `ceo_delivery_format` | Formats the final output for the delivery channel. |
| `ceo_context_pack` | Bundles stage context for long-term storage. |
| `ceo_context_restore` | Restores context from a previous session or stage. |

## State Schema

The plugin maintains its state in a local SQLite database (`.ceo/state.db`).

### Primary Tables

*   `pipeline_runs`: Tracks the top-level progress of each task session.
*   `stage_executions`: Records every attempt and result for individual stages.
*   `artifacts`: Links stages to their JSON/file outputs (stored in `.ceo/artifacts/`).
*   `gates`: Tracks approval requests and resolutions.
*   `decisions`: A chronological log of reasoning and pivot points.

## Compaction Survival

To handle context window limits, `opencode-ceo` implements a "State-First" architecture:

1.  **Stateless Sessions**: The CEO agent doesn't rely on long-term conversation history.
2.  **Runtime Hook Orchestration**: The `chat.message` hook creates or resumes the current pipeline and advances it until it reaches `blocked`, `failed`, or `completed`.
3.  **Compaction Integration**: `experimental.session.compacting` injects a packed SQLite-backed summary into compaction context, and `ceo_context_restore` rebuilds state from SQLite on resume.
4.  **Artifact Persistence**: Large data (like full code diffs or logs) is stored in the file system and summarized into compact runtime context, preserving tokens.
