# Model Recommendations

This guide helps tune `modelPreferences` for the delivery stages.

## General Rule

- use high-reasoning models for planning and review
- use coding-optimized models for implementation
- use fast and reliable models for repetitive validation

## Suggested Profiles by Stage

| Stage | Model profile | Why |
|------|---------------|-----|
| `decompose` | high-reasoning | better architecture and task breakdown |
| `implement` | coding-specialized | faster code generation and refactoring |
| `review` | critical-reasoning | stronger risk detection and change critique |
| `test` | fast-validation | cheaper iterative checks |

## Example Mapping

```json
{
  "modelPreferences": {
    "decompose": "gpt-5.4",
    "implement": "gpt-5.4",
    "review": "gpt-5.4",
    "test": "gpt-5.4-mini"
  }
}
```

Replace those identifiers with the model IDs available in your OpenCode environment.

## Practical Advice

- optimize for consistency before cost-cutting
- keep review stronger than test when budgets are tight
- avoid mixing weak planning with strong implementation
