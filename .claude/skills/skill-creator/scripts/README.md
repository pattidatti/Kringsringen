# Skill Creator Scripts

This directory contains Python scripts used during the skill evaluation and optimization workflow.

## Scripts Overview

### aggregate_benchmark.py

Combines timing and grading data from individual test runs into a unified benchmark report.

**Usage:**
```bash
python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
```

**Input:**
- Directory structure from test runs:
  ```
  iteration-N/
  ├── eval-0/
  │   ├── with_skill/
  │   │   ├── timing.json
  │   │   └── grading.json
  │   └── without_skill/
  │       ├── timing.json
  │       └── grading.json
  └── eval-1/
      └── ...
  ```

**Output:**
- `iteration-N/benchmark.json` - Machine-readable metrics
- `iteration-N/benchmark.md` - Human-readable summary

### run_loop.py

Optimizes a skill's description for better triggering accuracy.

**Usage:**
```bash
python -m scripts.run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id> \
  --max-iterations 5 \
  --verbose
```

**Process:**
1. Splits eval set: 60% train, 40% test
2. Evaluates current description (3 runs per query)
3. Proposes improvements via extended thinking
4. Re-evaluates on train and test
5. Iterates up to 5 times
6. Returns best description (selected by test score)

**Output:**
- HTML report in browser showing iteration progress
- JSON with `best_description` and iteration metrics

### package_skill.py

Packages a skill directory into a `.skill` file for distribution.

**Usage:**
```bash
python -m scripts.package_skill <path/to/skill-folder>
```

**Output:**
- `<skill-name>.skill` - Installable skill package

## Scripts You'll Create

As you create skills, you may want to bundle helper scripts:

```
my-skill/
├── SKILL.md
└── scripts/
    ├── create_docx.py      # Generate Word docs
    ├── extract_tables.py   # Parse tables from PDFs
    └── validate_format.py  # Check output validity
```

These can be called from within the skill's instructions and are reusable across all invocations.

## Dependencies

All scripts assume:
- Python 3.8+
- Dependencies listed in `requirements.txt` (if exists)
- Execution in the skill creator workspace

## Notes

- Scripts are optional — many skills don't need them
- Keep scripts focused and reusable
- Document expected input/output formats
- Return clear exit codes (0 = success, 1 = failure)
