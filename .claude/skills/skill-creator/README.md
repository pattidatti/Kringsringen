# Skill Creator Skill

A comprehensive skill for creating, testing, evaluating, and optimizing Claude skills.

## Overview

The Skill Creator guides you through the complete workflow:

1. **Capture Intent** - Understand what the skill should do
2. **Draft SKILL.md** - Write the skill with clear instructions
3. **Create Test Cases** - Define evaluation prompts
4. **Run Tests** - Execute with and without the skill
5. **Review & Evaluate** - Assess quantitative and qualitative results
6. **Iterate** - Improve based on feedback
7. **Optimize Description** - Fine-tune triggering accuracy
8. **Package** - Create distributable `.skill` file

## Directory Structure

```
skill-creator/
├── SKILL.md                    # Main instructions (invoke this skill to start)
├── README.md                   # This file
├── references/
│   └── schemas.md             # JSON schemas for evals, grading, benchmarks
├── agents/
│   ├── grader.md              # How to evaluate test outputs
│   ├── analyzer.md            # How to analyze benchmark results
│   └── comparator.md          # How to do blind A/B comparisons
├── scripts/
│   └── README.md              # Guide to bundled evaluation scripts
└── assets/
    └── eval_review.html       # Browser UI for eval set review
```

## Quick Start

1. **Invoke the skill:**
   ```
   /skill-creator
   ```

2. **The skill will guide you through:**
   - Clarifying what you want your skill to do
   - Writing a draft SKILL.md
   - Creating test cases
   - Running evaluations
   - Improving based on feedback
   - Optimizing and packaging

## Key Concepts

### Skill.md Structure

Every skill has a SKILL.md file with YAML frontmatter:

```yaml
---
name: skill-name
description: When to trigger + what it does
compatibility: Required tools (optional)
---
```

The description is critical — it determines when Claude invokes your skill. Make it clear, specific, and slightly "pushy" to counteract undertriggering.

### Test Cases (evals.json)

Define a few realistic user prompts to verify your skill works:

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 0,
      "prompt": "User's task prompt",
      "expected_output": "What success looks like",
      "files": [],
      "assertions": [...]
    }
  ]
}
```

### Evaluation Workflow

For each test case, run **two** subagents in parallel:

1. **With-skill**: Claude uses your skill to complete the task
2. **Baseline**: Same prompt, no skill (or old version for improvements)

Compare outputs qualitatively (browser viewer) and quantitatively (assertions, timing, tokens).

### Assertions

Objective checks on outputs:

```json
{
  "name": "file_created",
  "description": "Output CSV file exists with correct name",
  "type": "file_exists"
}
```

Good assertions:
- ✓ Objectively verifiable
- ✓ Discriminating (differ between with/without skill)
- ✓ Realistic (measure what matters)

Bad assertions:
- ✗ Always pass or always fail (non-discriminating)
- ✗ Subjective ("output is creative")
- ✗ Too strict ("output must be <200 characters")

### Iteration Loop

1. Run test cases → View results → User feedback
2. Improve skill based on feedback
3. Rerun test cases → Compare to previous iteration
4. Repeat until satisfied

The goal is **generalization**, not overfitting to test cases. If you see a pattern in feedback across multiple evals, address it systematically rather than tweaking individual cases.

## Workspace Structure

When evaluating a skill, create a workspace:

```
my-skill-workspace/
├── iteration-1/
│   ├── benchmark.json         # Quantitative comparison
│   ├── benchmark.md           # Human-readable stats
│   ├── eval-0/
│   │   ├── with_skill/
│   │   │   ├── outputs/
│   │   │   ├── timing.json
│   │   │   └── grading.json
│   │   └── without_skill/
│   │       ├── outputs/
│   │       ├── timing.json
│   │       └── grading.json
│   ├── eval-1/
│   │   └── ... (same structure)
│   └── eval-metadata.json
├── iteration-2/
│   └── ... (same, but comparing with iteration-1)
└── feedback.json              # User reviews from eval viewer
```

## Evaluation Tools

### eval-viewer

Browser-based UI for reviewing test outputs:

```bash
python eval-viewer/generate_review.py <workspace>/iteration-N \
  --skill-name "my-skill" \
  --benchmark <workspace>/iteration-N/benchmark.json
```

Features:
- **Outputs tab**: Click through each test case, see with/without skill outputs side-by-side
- **Feedback tab**: Leave notes on each output
- **Benchmark tab**: Quantitative metrics (pass rate, tokens, time)
- **Previous iteration**: Compare to last iteration

### benchmark.json

Machine-readable metrics for analysis:

```json
{
  "skill_name": "my-skill",
  "iterations": [
    {
      "iteration": 1,
      "configurations": [
        {
          "name": "with_skill",
          "tests": [...],
          "overall": {
            "pass_rate": 0.94,
            "avg_tokens": 45234,
            "avg_duration_seconds": 12.3
          }
        }
      ]
    }
  ]
}
```

## Best Practices

### For Skill Design

1. **Keep SKILL.md under 500 lines** - Reference bundled docs for large content
2. **Explain the why** - Help Claude understand reasoning, not just rules
3. **Avoid rigid MUST/NEVER** - Use softer language and explain context
4. **Look for repeated work** - If all test runs create the same helper script, bundle it
5. **Generalize from feedback** - Don't overfit to test cases; address patterns

### For Test Cases

1. **Be realistic** - Use actual user language, not abstract prompts
2. **Include variety** - Different lengths, styles, edge cases
3. **Make them substantive** - Skills work best on complex, multi-step tasks
4. **2-3 is enough for iteration** - More for final validation
5. **Include assertions** - Helps automate grading and compare across iterations

### For Descriptions

1. **Include "when to use"** - Not just what it does
2. **Be slightly pushy** - Combat undertriggering with specific contexts
3. **List file types/keywords** - Help Claude recognize relevant tasks
4. **Include examples** - Real-world use cases help triggering
5. **Test with trigger evals** - Optimize with the description optimizer

## Common Patterns

### Pattern: Data Transformation

For skills that transform files (CSV → Excel, format conversions):

- **Test cases**: Different input formats, edge cases (empty fields, special chars)
- **Assertions**: File format valid, all rows preserved, column names correct
- **Description**: Include file type names ("CSV", "Excel", etc.)

### Pattern: Code Generation

For skills that write code:

- **Test cases**: Different languages, project types, complexity levels
- **Assertions**: Syntax valid, compiles/runs, test coverage
- **Description**: Languages, frameworks, problem types

### Pattern: Document/Report Creation

For skills that produce documents:

- **Test cases**: Different sections, data types, formatting requirements
- **Assertions**: All sections present, formatting correct, readability
- **Description**: Document types, use cases, outputs (PDF, DOCX, etc.)

### Pattern: Analysis/Extraction

For skills that analyze or extract from content:

- **Test cases**: Different content types, lengths, complexity
- **Assertions**: Accuracy, completeness, structure correctness
- **Description**: Content types, analysis types, output format

## Troubleshooting

### Skill Not Triggering?

1. Review the description — is it specific enough?
2. Run trigger eval set and optimize description
3. Check if you're asking for something too simple (skills trigger on complex tasks)
4. Make sure description includes relevant keywords and contexts

### Test Results Look Inconsistent?

1. Check assertion quality — are they measuring the right things?
2. Look for high variance in timing/tokens (suggests flakiness)
3. Verify test cases are substantive enough for skill to add value
4. Consider environmental factors (API latency, randomness in outputs)

### Difficult to Improve Further?

1. Read transcripts from test runs — look for repeated patterns
2. Focus improvements on highest-impact assertions
3. Don't overfit — generalize from feedback patterns
4. Consider if test cases are representative enough

## Resources

- **SKILL.md** - Main entry point with detailed workflow
- **references/schemas.md** - JSON structure documentation
- **agents/grader.md** - How to evaluate test outputs
- **agents/analyzer.md** - How to analyze benchmark data
- **agents/comparator.md** - How to do blind A/B comparisons
- **scripts/README.md** - Guide to evaluation and optimization scripts

## Next Steps

Ready to create a skill?

1. **Call the skill**: Use `/skill-creator` or invoke directly
2. **Follow the workflow**: Capture intent → draft → test → evaluate → improve
3. **Iterate**: The loop repeats until you're satisfied
4. **Optimize & Package**: Polish the description and package for distribution

Good luck! 🚀
