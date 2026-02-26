---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, update or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy. Activate this skill whenever users mention building, creating, improving, testing, or optimizing skills for Claude.
compatibility: Requires Python 3.8+, git, subagents for full evaluation suite (can run test cases locally in Claude.ai or Cowork without subagents)
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

At a high level, the process of creating a skill goes like this:

- Decide what you want the skill to do and roughly how it should do it
- Write a draft of the skill
- Create a few test prompts and run claude-with-access-to-the-skill on them
- Help the user evaluate the results both qualitatively and quantitatively
  - While the runs happen in the background, draft some quantitative evals if there aren't any
  - Use the eval-viewer to show results
- Rewrite the skill based on feedback from the evaluation
- Repeat until satisfied
- Expand the test set and try again at larger scale
- Optimize the skill description for better triggering

## Creating a Skill

### Capture Intent

Start by understanding the user's intent. Ask clarifying questions:

1. **What should this skill enable Claude to do?** Describe the core capability or workflow.
2. **When should this skill trigger?** What user phrases, contexts, or file types?
3. **What's the expected output format?** Code? Documents? Structured data? Creative work?
4. **Should we set up test cases?** Objectively verifiable outputs (code generation, data extraction, file transforms, workflows) benefit from test cases. Subjective outputs (writing style, design) often just need human feedback.

### Interview and Research

Ask proactive questions about:
- Edge cases and failure modes
- Input/output formats with examples
- Success criteria and constraints
- Dependencies on external tools or APIs

### Write the SKILL.md

Create a file with these components:

```yaml
---
name: skill-name
description: When to trigger + what it does. Include both "what" and "when to use".
             Make descriptions slightly "pushy" to combat undertriggering. List
             contexts where the skill applies, even if not explicitly requested.
compatibility: Required tools/dependencies (optional, rarely needed)
---
```

Then the markdown body with your instructions.

#### Skill Writing Guide

**File Structure:**
```
skill-name/
├── SKILL.md              (required, <500 lines ideal)
└── Bundled Resources     (optional)
    ├── scripts/          (executables for repetitive tasks)
    ├── references/       (docs loaded as needed)
    └── assets/           (templates, icons, fonts)
```

**Key Principles:**

1. **Keep SKILL.md lean** - Under 500 lines. Reference bundled docs clearly.
2. **Explain the why** - Help Claude understand not just what to do, but why it matters.
3. **Use imperative form** - "Create", "Extract", "Analyze" rather than "The skill creates..."
4. **Avoid rigid MUST/NEVER** - Explain reasoning so Claude can generalize beyond literal instructions.
5. **Progressive disclosure** - Metadata always loaded (~100 words), SKILL.md on trigger, resources as-needed.
6. **No surprises** - Contents must align with description. No malware, exploits, or misleading intent.

**Output Format Example:**
```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

### Test Cases

Create 2-3 realistic test prompts — the kind real users would ask. Share with user: "Here are the test cases I'd like to try. Do these look right?"

Save to `evals/evals.json`:

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt here",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

## Running and Evaluating Test Cases

### Step 1: Spawn Runs in Parallel

For each test case, create two subagent tasks:

**With-skill run:**
- Skill path: `<path-to-skill>`
- Task: `<eval prompt>`
- Save to: `<workspace>/iteration-1/eval-<ID>/with_skill/outputs/`

**Baseline run:**
- For new skills: same prompt, **no skill**
- For improvements: use previous version as baseline
- Save to: `<workspace>/iteration-1/eval-<ID>/without_skill/outputs/`

Launch both at once so they finish around the same time. Create `eval_metadata.json` for each test:

```json
{
  "eval_id": 0,
  "eval_name": "descriptive-test-name",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

### Step 2: Draft Assertions While Runs Progress

Quantitative assertions should be:
- **Objectively verifiable** - Can be checked programmatically or with clear criteria
- **Descriptively named** - Should read clearly in benchmark viewer
- **Realistic** - Test what actually matters for skill success

For subjective skills (writing, design), prefer human review over forced assertions.

Examples:
```json
{
  "name": "output_file_created",
  "description": "CSV file is created with correct name",
  "type": "file_exists"
},
{
  "name": "all_rows_preserved",
  "description": "Output contains all input rows",
  "type": "row_count"
}
```

Update `eval_metadata.json` and `evals/evals.json` with assertions.

### Step 3: Capture Timing Data

When each subagent completes, save timing to `timing.json`:

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

This data comes only in task completion notifications — save it immediately.

### Step 4: Grade, Aggregate, and Review

1. **Grade each run** - Evaluate assertions against outputs. Save to `grading.json`:
```json
{
  "expectations": [
    {"text": "Output file created", "passed": true, "evidence": "file_path: ..."},
    {"text": "Data integrity check", "passed": false, "evidence": "Row count mismatch..."}
  ]
}
```

2. **Aggregate into benchmark** - Run:
```bash
python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
```

3. **Launch eval viewer**:
```bash
python <skill-creator-path>/eval-viewer/generate_review.py \
  <workspace>/iteration-N \
  --skill-name "my-skill" \
  --benchmark <workspace>/iteration-N/benchmark.json
```

For iteration 2+, also pass `--previous-workspace <workspace>/iteration-<N-1>`.

The viewer shows outputs, formal grades, and lets user leave feedback. Quantitative tab shows pass rates, timing, tokens with stats and analyst observations.

### Step 5: Read Feedback

When user is done, read `feedback.json`:
```json
{
  "reviews": [
    {"run_id": "eval-0-with_skill", "feedback": "needs axis labels", "timestamp": "..."},
    {"run_id": "eval-1-with_skill", "feedback": "", "timestamp": "..."}
  ],
  "status": "complete"
}
```

Empty feedback = user thought it was fine. Focus improvements on specific complaints.

## Improving the Skill

### How to Think About Improvements

1. **Generalize from feedback** - You're iterating on a few examples, but the skill must work millions of times. Avoid overfitting to test cases. If there's a stubborn issue, try different metaphors or working patterns rather than fiddly tweaks.

2. **Keep the prompt lean** - Remove things not pulling weight. Read transcripts: if the skill wastes time on unproductive steps, remove those instructions.

3. **Explain the why** - LLMs have good theory of mind. Instead of rigid ALWAYS/NEVER, explain reasoning so they can generalize and improvise.

4. **Look for repeated work** - If all test runs independently wrote the same helper script, bundle it in `scripts/` so future runs don't reinvent the wheel.

### The Iteration Loop

After improving:

1. Update the skill
2. Rerun all test cases into `iteration-<N+1>/` with baselines
3. Launch reviewer with `--previous-workspace` flag
4. Wait for user feedback
5. Read feedback, improve, repeat

Stop when:
- User says they're happy
- All feedback is empty (everything looks good)
- Not making meaningful progress

## Description Optimization

After the skill is solid, optimize its description for better triggering.

### Generate Trigger Eval Queries

Create 20 realistic queries (mix of should-trigger and should-not-trigger):

```json
[
  {"query": "ok so i have this xlsx file... want to add a profit margin column", "should_trigger": true},
  {"query": "write me a fibonacci function", "should_trigger": false}
]
```

**Should-trigger queries (8-10):**
- Different phrasings of the same intent (formal and casual)
- Cases where user doesn't name the skill but clearly needs it
- Uncommon use cases

**Should-not-trigger queries (8-10):**
- Near-misses: share keywords but need something different
- Adjacent domains where this skill competes but shouldn't win
- Tricky cases, not obvious rejections

### Review with User

Present eval set to user via HTML template. They can edit, toggle should-trigger, then export as JSON.

### Run Optimization Loop

```bash
python -m scripts.run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id> \
  --max-iterations 5 \
  --verbose
```

This:
- Splits eval 60% train / 40% test
- Evaluates current description (3 runs per query for reliability)
- Proposes improvements via extended thinking
- Re-evaluates on train and test
- Iterates up to 5 times
- Returns JSON with `best_description` (selected by test score to avoid overfitting)

### Apply Result

Update SKILL.md frontmatter with `best_description`. Show user before/after with scores.

## Packaging (if available)

```bash
python -m scripts.package_skill <path/to/skill-folder>
```

Produces a `.skill` file the user can install.

## Special Considerations

### Claude.ai (No Subagents)

- Run test cases sequentially yourself using the skill
- Skip baseline runs
- Present results directly in conversation (no browser viewer)
- For files output, save to filesystem for download
- Skip quantitative benchmarking — focus on qualitative feedback
- Skip description optimization (requires `claude -p` CLI)

### Cowork (No Browser Display)

- You have subagents, so run tests in parallel
- Use `--static <output_path>` with eval viewer to write standalone HTML
- Provide link for user to open in browser
- Feedback downloads as `feedback.json` file — read from there
- Description optimization should work (uses subprocess, not browser)

### Triggering Mechanics

Claude decides whether to use a skill based on name + description in its `available_skills` list. Skills are most reliable for **complex, multi-step, specialized queries** that benefit from a dedicated workflow. Simple queries may not trigger even with matching descriptions. This means eval queries should be substantive enough that Claude would genuinely benefit from consulting a skill.

## Workflow Summary

1. **Capture intent** - What? When? Output format? Test cases needed?
2. **Interview** - Ask about edge cases, formats, criteria
3. **Draft SKILL.md** - Write instructions, lean and reasoned
4. **Create test cases** - 2-3 realistic prompts, save to evals.json
5. **Run tests** - Parallel with/baseline, capture timing
6. **Draft assertions** - Objective, descriptive, realistic
7. **Review outputs** - Use eval viewer, get user feedback
8. **Improve skill** - Generalize from feedback, don't overfit
9. **Iterate** - Rerun tests, improve based on feedback
10. **Optimize description** - Run trigger eval loop if desired
11. **Package & present** - Deliver final `.skill` file

Good luck!
