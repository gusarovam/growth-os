const OPENAI_URL = "https://api.openai.com/v1/responses";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

const schemas = {
  daily_plan: {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      affirmation: { type: "string" },
      rationale: { type: "string" },
      big_three: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            source_task_id: { type: "string" },
            why: { type: "string" }
          },
          required: ["title", "source_task_id", "why"]
        }
      },
      schedule: {
        type: "array",
        minItems: 1,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            start: { type: "string" },
            end: { type: "string" },
            category: { type: "string" },
            source_task_id: { type: "string" },
            goal_id: { type: "string" },
            note: { type: "string" }
          },
          required: ["title", "date", "start", "end", "category", "source_task_id", "goal_id", "note"]
        }
      },
      anti_procrastination_tip: { type: "string" },
      scroll_rule: { type: "string" }
    },
    required: ["headline", "affirmation", "rationale", "big_three", "schedule", "anti_procrastination_tip", "scroll_rule"]
  },
  goal_breakdown: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      area: { type: "string" },
      measurable_outcome: { type: "string" },
      success_definition: { type: "string" },
      strategy: { type: "string" },
      milestones: {
        type: "array",
        minItems: 3,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            target_date: { type: "string" },
            success_criteria: { type: "string" }
          },
          required: ["title", "target_date", "success_criteria"]
        }
      },
      first_actions: {
        type: "array",
        minItems: 2,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            start: { type: "string" },
            end: { type: "string" },
            duration_minutes: { type: "integer" },
            why: { type: "string" }
          },
          required: ["title", "date", "start", "end", "duration_minutes", "why"]
        }
      },
      weekly_rhythm: { type: "string" },
      risk: { type: "string" },
      fallback_plan: { type: "string" }
    },
    required: ["title", "area", "measurable_outcome", "success_definition", "strategy", "milestones", "first_actions", "weekly_rhythm", "risk", "fallback_plan"]
  },
  weekly_coach: {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      summary: { type: "string" },
      wins: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
      patterns: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
      bottleneck: { type: "string" },
      next_week_rules: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
      recommended_big_three: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
      encouragement: { type: "string" }
    },
    required: ["headline", "summary", "wins", "patterns", "bottleneck", "next_week_rules", "recommended_big_three", "encouragement"]
  },
  replan_week: {
    type: "object",
    additionalProperties: false,
    properties: {
      message: { type: "string" },
      changes: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
      schedule: {
        type: "array",
        minItems: 1,
        maxItems: 14,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            start: { type: "string" },
            end: { type: "string" },
            category: { type: "string" },
            goal_id: { type: "string" },
            source_task_id: { type: "string" },
            note: { type: "string" }
          },
          required: ["title", "date", "start", "end", "category", "goal_id", "source_task_id", "note"]
        }
      }
    },
    required: ["message", "changes", "schedule"]
  },
  procrastination_rescue: {
    type: "object",
    additionalProperties: false,
    properties: {
      reframed_task: { type: "string" },
      first_tiny_step: { type: "string" },
      ten_minute_plan: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
      remove_friction: { type: "string" },
      closing_line: { type: "string" }
    },
    required: ["reframed_task", "first_tiny_step", "ten_minute_plan", "remove_friction", "closing_line"]
  }
};

function systemPrompt(action) {
  const shared = `You are the planning engine inside Growth OS, a calm personal growth planner.\n\nCore principles:\n- Translate ambitions into concrete, small, schedulable actions.\n- Never shame the user or use harsh productivity language.\n- Optimize for sustainable consistency over maximal workload.\n- Prefer 1-3 meaningful priorities per day.\n- Protect sleep, meals, breaks, exercise, recovery and existing hard commitments.\n- Avoid unrealistic schedules and avoid filling every free minute.\n- When energy is low, reduce scope before moving deadlines.\n- Make starting easy: actions should usually be 10-60 minutes.\n- Treat scrolling as a behavior to manage intentionally, not a moral failure.\n- Dates must be ISO YYYY-MM-DD. Times must be 24-hour HH:MM.\n- If an ID from the input is unknown or not applicable, return an empty string rather than inventing one.\n- Return only data matching the provided schema.`;

  const actionPrompts = {
    daily_plan: `\nTask: build a realistic plan for the user's day from their tasks, goals, calendar blocks, energy and free-form note. Keep existing fixed events intact and schedule around them. Pick the Big 3 by impact, urgency and connection to long-term goals. Include a short personalized affirmation and one practical anti-procrastination rule.`,
    goal_breakdown: `\nTask: turn the user's wish or goal into a measurable outcome, milestone path and first calendar actions. Work backward from the deadline. Respect available hours per week, preferred time of day, days off and intensity. The first actions should be specific enough to execute without additional planning.`,
    weekly_coach: `\nTask: analyze the last week using the supplied history, tasks, focus sessions, goal progress, energy and scrolling data. Identify patterns carefully; do not claim causation from tiny samples. Recommend a small set of rules for next week.`,
    replan_week: `\nTask: reorganize the next 7 days after missed work or changed circumstances. Preserve fixed commitments. Protect the highest-value goal actions, drop or shrink lower-value work, and avoid simply stacking missed tasks onto tomorrow.`,
    procrastination_rescue: `\nTask: help the user start one task they are avoiding. Break it into an absurdly easy first step and a 10-minute sequence. Remove ambiguity and friction. Keep it concrete and brief.`
  };
  return shared + (actionPrompts[action] || "");
}

function extractOutputText(response) {
  if (typeof response.output_text === "string" && response.output_text) return response.output_text;
  for (const item of response.output || []) {
    for (const part of item.content || []) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "AI is not connected yet. Add OPENAI_API_KEY to the server environment."
    });
  }

  const { action, payload } = req.body || {};
  if (!schemas[action]) {
    return res.status(400).json({ error: "Unknown AI action" });
  }

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        input: [
          { role: "system", content: systemPrompt(action) },
          { role: "user", content: JSON.stringify(payload ?? {}) }
        ],
        text: {
          format: {
            type: "json_schema",
            name: `growth_os_${action}`,
            strict: true,
            schema: schemas[action]
          }
        }
      })
    });

    const raw = await response.json();
    if (!response.ok) {
      console.error("OpenAI error", raw);
      return res.status(response.status).json({ error: raw?.error?.message || "OpenAI request failed" });
    }

    const text = extractOutputText(raw);
    if (!text) return res.status(502).json({ error: "The AI returned no structured output" });

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Parse error", text);
      return res.status(502).json({ error: "The AI returned invalid structured data" });
    }

    return res.status(200).json({ data, model: MODEL });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "AI request failed" });
  }
}
