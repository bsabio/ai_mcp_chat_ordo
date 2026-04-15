# Tool Spec 04 — Advanced Calculator & Math Engine

> **Status:** Draft
> **Priority:** Medium — expands a working tool into a comprehensive math platform
> **Scope:** Expression evaluation, unit conversion, statistics, formula memory
> **Dependencies:** None
> **Affects:** `calculator` tool

---

## 1. Problem Statement

The current calculator supports exactly four operations (`add`, `subtract`,
`multiply`, `divide`) on exactly two operands. The system prompt marks it as
"mandatory for every math calculation," and `looksLikeMath()` forces
`tool_choice` to the calculator for math-like inputs.

This means:
- "What is 2^10?" → calculator is forced, but it can't compute exponents.
- "Convert 16px to rem" → relevant in UI Design context, but unsupported.
- "What's the average of these test scores?" → statistics, unsupported.
- "Calculate 15% tip on $45.80" → needs `45.80 * 0.15`, can't chain.

The book series covers data analytics, product management (metrics), and
accessibility (contrast ratios, font scaling) — all domains where math matters.

---

## 2. Target Architecture

### 2.1 Expression Evaluator

Replace the 4-operation command with a safe expression evaluator. Use `mathjs`
(MIT license, no `eval()`, sandboxed by default).

**Supported operations:**

| Category | Examples |
| --- | --- |
| Basic arithmetic | `2 + 3 * 4`, `(10 - 3) / 2` |
| Exponents | `2^10`, `sqrt(144)`, `cbrt(27)` |
| Percentages | `15% of 45.80` → parsed to `0.15 * 45.80` |
| Trigonometry | `sin(pi/4)`, `cos(0)`, `atan2(1, 1)` |
| Logarithms | `log(100)`, `ln(e^3)`, `log2(256)` |
| Constants | `pi`, `e`, `phi` (golden ratio) |
| Rounding | `round(3.14159, 2)`, `ceil(2.3)`, `floor(2.7)` |
| Absolute value | `abs(-5)` |
| Modulo | `17 mod 3`, `17 % 3` |

### 2.2 Unit Conversion

Domain-relevant conversions for design, engineering, and analytics:

| Domain | Conversions |
| --- | --- |
| **Typography** | `px ↔ rem ↔ em ↔ pt ↔ %` (configurable base: 16px default) |
| **Length** | `cm ↔ in ↔ mm ↔ px` (at 96 DPI) |
| **Color** | Hex ↔ RGB ↔ HSL (e.g., `#FF5733` → `rgb(255, 87, 51)`) |
| **Data** | `KB ↔ MB ↔ GB ↔ TB` |
| **Time** | `ms ↔ s ↔ min ↔ hr` |
| **Angle** | `deg ↔ rad ↔ turn` |
| **Accessibility** | WCAG contrast ratio calculator: `contrast(#FFFFFF, #000000)` → `21:1` |

### 2.3 Statistics Functions

| Function | Example | Returns |
| --- | --- | --- |
| `mean(values)` | `mean(4, 8, 15, 16, 23, 42)` | `18` |
| `median(values)` | `median(1, 2, 3, 4, 100)` | `3` |
| `stddev(values)` | `stddev(2, 4, 4, 4, 5, 5, 7, 9)` | `2` |
| `variance(values)` | `variance(2, 4, 4, 4, 5, 5, 7, 9)` | `4` |
| `min(values)` | `min(3, 1, 4, 1, 5)` | `1` |
| `max(values)` | `max(3, 1, 4, 1, 5)` | `5` |
| `sum(values)` | `sum(1, 2, 3, 4, 5)` | `15` |
| `percentile(values, p)` | `percentile([1,2,3,4,5], 90)` | `4.6` |

### 2.4 Enhanced Schema

```typescript
{
  name: "calculator",
  description: "Evaluate mathematical expressions, convert units, compute statistics, and calculate design-related values like contrast ratios. Mandatory for every math calculation.",
  input_schema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "Math expression to evaluate. Supports arithmetic, exponents, trig, log, sqrt, statistics (mean, median, stddev), and unit conversion. Examples: '2^10', 'sqrt(144)', 'mean(4, 8, 15)', '16px to rem', 'contrast(#FFFFFF, #333333)'"
      },
      // Legacy interface — still supported for backward compatibility
      operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
      a: { type: "number" },
      b: { type: "number" },
    },
  },
  roles: "ALL",
  category: "math",
}
```

**Dual-mode:** If `expression` is provided, use the expression evaluator. If
`operation` + `a` + `b` are provided (legacy), use the original calculator.
This preserves backward compatibility.

### 2.5 Sandboxing

`mathjs` is configured with a restricted scope:

- **No** `import`, `require`, `eval`, `Function`
- **No** file system or network access
- **No** infinite loops (configurable timeout: 1 second)
- **Only** whitelisted functions (math, statistics, unit conversion)
- **Limited** precision: 15 significant digits (JavaScript `Number`)

For the WCAG contrast ratio calculator, implement as a custom `mathjs` function:

```typescript
math.import({
  contrast: function(fg: string, bg: string): string {
    const fgLum = relativeLuminance(parseColor(fg));
    const bgLum = relativeLuminance(parseColor(bg));
    const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
    return `${ratio.toFixed(1)}:1`;
  }
});
```

---

## 3. Return Format

```typescript
interface CalculatorResponse {
  input: string;                   // the expression or operation
  result: number | string;         // numeric result or formatted string
  formatted: string;               // human-readable: "2^10 = 1024"
  unit?: string;                   // if unit conversion: "rem", "rgb", etc.
  steps?: string[];                // optional: intermediate steps for complex expressions
}
```

**Backward compatibility:** When using the legacy `{operation, a, b}` interface,
the response format matches the current `CalculatorResult` type exactly.

---

## 4. File Plan

### New Files

| File | Layer | Purpose |
| --- | --- | --- |
| `src/core/entities/math-engine.ts` | Core | Expression evaluation, unit conversion, statistics |
| `src/core/entities/color-utils.ts` | Core | Hex/RGB/HSL parsing, relative luminance, contrast ratio |
| `src/core/entities/unit-converter.ts` | Core | Typography/length/data/time conversions |

### Modified Files

| File | Change |
| --- | --- |
| `src/core/use-cases/tools/CalculatorTool.ts` | Dual-mode: expression or legacy operation |
| `src/core/use-cases/tools/calculator.tool.ts` | Updated schema with `expression` property |
| `src/core/entities/calculator.ts` | Kept as-is (legacy path) |
| `package.json` | Add `mathjs` dependency |

### New Dependencies

| Package | Size | License | Purpose |
| --- | --- | --- | --- |
| `mathjs` | ~500KB | Apache 2.0 | Safe expression evaluation |

---

## 5. Requirement IDs

| ID | Requirement |
| --- | --- |
| CALC-1 | Expression `"2^10"` returns `1024` |
| CALC-2 | Expression `"sqrt(144)"` returns `12` |
| CALC-3 | Expression `"mean(4, 8, 15, 16, 23, 42)"` returns `18` |
| CALC-4 | Expression `"16px to rem"` returns `1` (at 16px base) |
| CALC-5 | Expression `"contrast(#FFFFFF, #333333)"` returns WCAG contrast ratio |
| CALC-6 | Legacy `{operation: "add", a: 2, b: 3}` still returns `{operation, a, b, result: 5}` |
| CALC-7 | Malicious input `"require('fs')"` is rejected |
| CALC-8 | Expression timeout: `"while(true){}"` terminates within 1 second |
| CALC-9 | Statistics: `median`, `stddev`, `variance`, `percentile` all work |
| CALC-10 | Color utility: `contrast()` uses WCAG 2.1 relative luminance formula |

---

## 6. Test Scenarios

```text
TEST-CALC-01: "2 + 3 * 4" → 14 (operator precedence)
TEST-CALC-02: "2^10" → 1024
TEST-CALC-03: "sqrt(144)" → 12
TEST-CALC-04: "sin(pi/2)" → 1
TEST-CALC-05: "log2(256)" → 8
TEST-CALC-06: "mean(4, 8, 15, 16, 23, 42)" → 18
TEST-CALC-07: "median(1, 2, 3, 4, 100)" → 3
TEST-CALC-08: "16px to rem" → 1 (16px base)
TEST-CALC-09: "1in to cm" → 2.54
TEST-CALC-10: "contrast(#FFFFFF, #000000)" → "21:1"
TEST-CALC-11: "contrast(#FFFFFF, #777777)" → ~4.5:1 (WCAG AA boundary)
TEST-CALC-12: Legacy {operation: "add", a: 2, b: 3} → {result: 5}
TEST-CALC-13: "require('fs')" → Error: function not allowed
TEST-CALC-14: "1/0" → Infinity (handled gracefully)
TEST-CALC-15: Empty expression → Error: expression required
```

---

## 7. Security Considerations

The expression evaluator is a potential injection vector. Mitigations:

1. **Use `mathjs` limited evaluation** — `math.evaluate()` with a restricted
   scope. No access to `globalThis`, `process`, `require`.
2. **Whitelist functions** — only math, statistics, and unit functions.
3. **Timeout** — kill evaluation after 1 second.
4. **Input length limit** — reject expressions >500 characters.
5. **No string interpolation** — expressions are treated as math, not code.
6. **Test the sandbox** — dedicated security tests for bypass attempts.
