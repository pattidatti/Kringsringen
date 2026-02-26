# Skill Creator Quick Reference

## The Core Loop

```
1. Capture Intent
   ↓
2. Draft SKILL.md
   ↓
3. Create Test Cases
   ↓
4. Run Tests (with-skill + baseline)
   ↓
5. Review Results (qualitative + quantitative)
   ↓
6. Improve Skill
   ↓
7. Repeat 4-6 until satisfied
   ↓
8. Optimize Description
   ↓
9. Package & Deliver
```

## Quick Commands

### Run Tests

```bash
# Spawn subagents for all test cases
for eval in evals/*; do
  claude -p "Run this test case with skill..."
  claude -p "Run this test case without skill..."
done
```

### Generate Viewer

```bash
python eval-viewer/generate_review.py <workspace>/iteration-N \
  --skill-name "my-skill" \
  --benchmark <workspace>/iteration-N/benchmark.json
```

### Optimize Description

```bash
python -m scripts.run_loop \
  --eval-set trigger-evals.json \
  --skill-path my-skill/ \
  --model claude-opus-4-6 \
  --max-iterations 5
```

## SKILL.md Template

```yaml
---
name: skill-name
description: When to trigger (include contexts and keywords).
             What it does. Make it slightly "pushy".
compatibility: Required tools (optional)
---

# Skill Title

## What This Skill Does

Clear explanation of the capability and how it works.

## When to Use This Skill

Specific contexts where this skill applies. Not just keywords, but actual scenarios.

## How It Works

Step-by-step workflow or instructions.

## Important Notes

Edge cases, limitations, dependencies.
```

## Test Case Structure

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 0,
      "prompt": "Realistic user task (not abstract)",
      "expected_output": "Brief description of what success looks like",
      "files": ["path/to/input/files"],
      "assertions": [
        {
          "name": "output_file_created",
          "description": "Readable description",
          "type": "file_exists"
        }
      ]
    }
  ]
}
```

## Assertion Types

| Type | Example | Use When |
|---|---|---|
| `file_exists` | Output file created | Checking output file creation |
| `row_count` | All input rows preserved | Data transformation tasks |
| `contains_text` | Section header present | Document generation |
| `csv_valid` | CSV format correct | Spreadsheet outputs |
| `json_valid` | JSON structure correct | API/data exports |
| `custom` | Custom logic | Anything else |

## Directory Structure for Skills

```
my-skill/
├── SKILL.md                 # Required
├── scripts/
│   ├── helper.py           # Reusable scripts
│   └── validate.py         # Validation logic
├── references/
│   ├── templates.md        # Example templates
│   └── glossary.md         # Domain terms
└── assets/
    ├── icon.png            # Skill icon
    └── example.txt         # Example file
```

## Workspace Structure

```
my-skill-workspace/
├── iteration-1/
│   ├── eval-0/
│   │   ├── with_skill/
│   │   │   ├── outputs/        # Generated files
│   │   │   ├── transcript.txt  # Claude's working
│   │   │   ├── timing.json
│   │   │   └── grading.json
│   │   └── without_skill/
│   │       └── ... (same structure)
│   ├── benchmark.json
│   ├── benchmark.md
│   └── eval-metadata.json
├── iteration-2/
│   └── ... (same structure)
└── feedback.json
```

## Feedback Loop

**After user reviews in eval viewer:**

```json
{
  "reviews": [
    {
      "run_id": "eval-0-with_skill",
      "feedback": "Perfect! Formatting is clean.",
      "timestamp": "..."
    },
    {
      "run_id": "eval-0-without_skill",
      "feedback": "Missing important columns",
      "timestamp": "..."
    },
    {
      "run_id": "eval-1-with_skill",
      "feedback": "",  // Empty = thought it was fine
      "timestamp": "..."
    }
  ],
  "status": "complete"
}
```

## Trigger Eval Set

For description optimization:

```json
[
  {
    "query": "ok so i need to convert this big xlsx file with sales data into a PDF report",
    "should_trigger": true
  },
  {
    "query": "write a fibonacci algorithm",
    "should_trigger": false
  }
]
```

**Guidelines for trigger queries:**
- ✓ Realistic, substantive (not one-word prompts)
- ✓ Mix of should-trigger (8-10) and should-not-trigger (8-10)
- ✓ For should-not-trigger: focus on near-misses, not obvious rejections
- ✓ Include file names, project context, specific details

## Decision Tree: Keep Iterating?

```
Is the skill working?
├─ NO → Fix the problem, rerun tests
├─ SOMEWHAT → Improve based on feedback, iterate
└─ YES
   ├─ Is the description optimized?
   │  ├─ NO → Run trigger eval optimizer
   │  └─ YES → Ready to package
```

## Red Flags in Benchmark Results

| Flag | Meaning | Action |
|---|---|---|
| Assertion passes 100% with/without | Non-discriminating | Remove or make stricter |
| High variance in timing/tokens | Flaky skill | Investigate randomness sources |
| Baseline beats skill | Regression | Go back to previous iteration |
| Pass rate < 50% | Skill not working | Debug and rewrite |
| Unclear which is better | Need more evals | Expand test set |

## Skill Description Tips

**Bad:** "A tool for creating spreadsheets"

**Good:** "Create Excel spreadsheets and CSV files from data, text, or analysis. Use when users want to export data to Excel, create reports in XLSX format, convert CSV files, or build spreadsheets from JSON data."

**Why better:**
- Includes file formats (Excel, CSV, XLSX)
- Lists specific use cases (export, convert, build)
- Covers contexts (from data, text, analysis)
- Slightly "pushy" with multiple triggers

## Common Mistakes

1. **Over-detailed instructions** → Keep SKILL.md lean, <500 lines
2. **Testing simple tasks** → Skills work best on complex, multi-step workflows
3. **Overfitting to test cases** → Generalize patterns, don't tweak for edge cases
4. **Vague assertions** → Make them objective and measurable
5. **Skipping the feedback loop** → User reviews are critical for improvement
6. **Unoptimized descriptions** → Run trigger optimizer before final packaging

## Packaging & Distribution

```bash
python -m scripts.package_skill my-skill/
```

Creates `my-skill.skill` file that users can install.

## Environment-Specific Notes

### Claude Code (with subagents)
- ✓ Full workflow works
- ✓ Browser eval viewer available
- ✓ Run tests in parallel
- ✓ Description optimizer available

### Claude.ai (no subagents)
- Run tests sequentially yourself
- Present results directly (no browser)
- Skip baseline runs
- Skip quantitative benchmarking
- Skip description optimizer (needs CLI)

### Cowork (limited display)
- ✓ Run tests in parallel
- Use `--static` for eval viewer (HTML file)
- Download feedback as JSON
- Description optimizer should work
