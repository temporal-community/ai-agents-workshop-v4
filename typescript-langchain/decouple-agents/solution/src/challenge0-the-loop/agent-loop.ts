// ABOUTME: An agentic loop with nothing holding it up — a plain Node script, no Temporal anywhere.
// Run it, kill it mid-conversation, and read off exactly how many paid-for model calls vanished.

/**
 * There is not one Temporal import in this file, and that is the whole point.
 *
 * What is here is the loop every agent framework is built around: ask the
 * model, run whatever tool it asked for, hand the result back, ask again.
 * It works. It is also nothing but local variables in one process, so the
 * conversation exists exactly as long as the process does.
 *
 * Everything printed below — turn numbers, token counts, the running total —
 * is here so that when you kill this script you can put a number on what you
 * just threw away.
 */

import OpenAI from 'openai';

// The tools are the real ones the rest of the workshop uses. They are plain
// async functions that make network calls; nothing about them is special, and
// nothing about them is Temporal.
import { getCoordinates, getWeather } from '../shared/weatherActivities';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ChatTool = OpenAI.Chat.Completions.ChatCompletionTool;
type ChatToolCall = OpenAI.Chat.Completions.ChatCompletionMessageToolCall;
type ChatToolMessage = OpenAI.Chat.Completions.ChatCompletionToolMessageParam;

// ─── Deliberate slowdown ─────────────────────────────────────────────────────

/**
 * Pause between turns.
 *
 * This exists ONLY to make the demo killable. Without it the whole
 * conversation finishes in a couple of seconds and there is no window in which
 * a human can press Ctrl+C partway through. It is not rate limiting, it is not
 * retry backoff, and it would never appear in an agent you actually shipped.
 */
const TURN_PAUSE_MS = 4_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Tools, as the model sees them ───────────────────────────────────────────

const TOOLS: ChatTool[] = [
  {
    type: 'function',
    function: {
      name: 'getCoordinates',
      description: 'Look up the latitude and longitude of a city by name.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name, for example "Barcelona".' },
        },
        required: ['city'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getWeather',
      description:
        'Current temperature (Fahrenheit), weather code and wind speed for a latitude/longitude pair.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
        },
        required: ['latitude', 'longitude'],
        additionalProperties: false,
      },
    },
  },
];

// ─── The bill, as it accrues ─────────────────────────────────────────────────

let turnsStarted = 0;
let modelCalls = 0;
let toolCalls = 0;
let promptTokensTotal = 0;
let completionTokensTotal = 0;
let tokensTotal = 0;

function runningTotalLine(): string {
  return (
    `  RUNNING TOTAL   ${modelCalls} model call${modelCalls === 1 ? '' : 's'}, ` +
    `${toolCalls} tool call${toolCalls === 1 ? '' : 's'}, ${tokensTotal} tokens`
  );
}

// ─── The two things that touch the outside world ─────────────────────────────

interface ModelResponse {
  /** Undefined when the model answered instead of asking for a tool. */
  toolCalls?: ChatToolCall[];
  text: string | null;
}

/**
 * One model call.
 *
 * It appends the assistant's own message to `messages` before returning, so
 * that the loop at the bottom of this file stays the handful of lines it is.
 */
async function callModel(messages: ChatMessage[]): Promise<ModelResponse> {
  turnsStarted += 1;
  const turn = turnsStarted;

  console.log('');
  console.log(rule(`Turn ${turn}`));
  console.log(`  calling ${MODEL} with ${messages.length} message(s) of context...`);

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools: TOOLS,
  });

  // Counted only once the response is in hand, so the numbers below and the
  // numbers printed on Ctrl+C describe calls that actually completed.
  modelCalls += 1;

  const usage = completion.usage;
  const prompt = usage?.prompt_tokens ?? 0;
  const output = usage?.completion_tokens ?? 0;
  const total = usage?.total_tokens ?? prompt + output;

  promptTokensTotal += prompt;
  completionTokensTotal += output;
  tokensTotal += total;

  console.log(`  tokens          prompt ${prompt}  completion ${output}  total ${total}`);
  console.log(runningTotalLine());

  const message = completion.choices[0]?.message;
  if (!message) {
    throw new Error('The model returned no choices. Check OPENAI_MODEL and OPENAI_BASE_URL.');
  }

  // The assistant turn has to go into the transcript before its tool results,
  // or the next request is rejected for referencing tool calls that are not
  // in the conversation.
  messages.push(message);

  return {
    toolCalls: message.tool_calls && message.tool_calls.length > 0 ? message.tool_calls : undefined,
    text: message.content,
  };
}

/** Every tool the model asked for on this turn, run for real. */
async function runTools(requested: ChatToolCall[]): Promise<ChatToolMessage[]> {
  const results: ChatToolMessage[] = [];

  for (const call of requested) {
    if (call.type !== 'function') {
      results.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify({ error: 'unsupported_tool_type', type: call.type }),
      });
      continue;
    }

    const name = call.function.name;
    const rawArgs = call.function.arguments || '{}';
    toolCalls += 1;
    console.log(`  tool call       ${name}(${rawArgs})`);

    let content: string;
    try {
      const args = JSON.parse(rawArgs) as Record<string, unknown>;
      switch (name) {
        case 'getCoordinates':
          content = await getCoordinates({ city: String(args.city ?? '') });
          break;
        case 'getWeather':
          content = await getWeather({
            latitude: Number(args.latitude),
            longitude: Number(args.longitude),
          });
          break;
        default:
          content = JSON.stringify({ error: 'unknown_tool', name });
      }
    } catch (err) {
      // A thrown tool is fed back to the model as text. Nobody retries it;
      // there is nothing here that could.
      content = JSON.stringify({ error: 'tool_failed', message: (err as Error).message });
    }

    console.log(`                  -> ${preview(content)}`);
    results.push({ role: 'tool', tool_call_id: call.id, content });
  }

  return results;
}

/** A fixed-width section rule, so the transcript is easy to skim after the fact. */
function rule(title: string, width = 62): string {
  const head = `\u2500\u2500 ${title} `;
  return head + '\u2500'.repeat(Math.max(3, width - head.length));
}

function preview(text: string, width = 96): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > width ? `${oneLine.slice(0, width)}...` : oneLine;
}

// ─── Configuration, read from the environment the lab injects ────────────────

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';

function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. The lab injects it into every terminal tab at start; ' +
        'open a fresh tab, or export it by hand before running this script.',
    );
  }

  return new OpenAI({
    apiKey,
    // Unset means api.openai.com. The lab points this at its own gateway.
    baseURL: process.env.OPENAI_BASE_URL,
    // Fail loudly instead of hanging. A script that never returns teaches
    // nothing; a script that prints an error teaches something immediately.
    timeout: 60_000,
    maxRetries: 1,
  });
}

// Built at the top of main(), not here: a throw during module evaluation prints
// a stack trace instead of the message, and the message is the useful part.
let client: OpenAI;

const DEFAULT_QUESTION =
  'Compare the current weather in Barcelona, Tokyo and Reykjavik. ' +
  'Look each city up one at a time, then tell me which is warmest and which is windiest.';

// The word "step by step" is doing real work here: it pushes the model into
// one city per turn, which is what makes the loop long enough to interrupt.
const SYSTEM_PROMPT =
  'You are a weather assistant. Work step by step and handle one city at a time: ' +
  'look up its coordinates, then fetch its weather, then move to the next city. ' +
  'Do not request more than one city per turn. When you have every city, answer in plain prose.';

// ─── Losing it ───────────────────────────────────────────────────────────────

/**
 * Ctrl+C lands here. Nothing is saved, nothing is resumable — this handler
 * only reads back the counters so the cost of the interruption is a number on
 * the screen instead of a feeling.
 */
process.on('SIGINT', () => {
  console.log('');
  console.log('');
  console.log('^C  killed mid-conversation.');
  console.log('');
  console.log(`  model calls paid for and lost   ${modelCalls}`);
  console.log(`  tool calls already executed     ${toolCalls}`);
  console.log(`  tokens billed, then discarded   ${tokensTotal}`);
  console.log('');
  console.log('  The conversation was in this process. There is no record of it anywhere');
  console.log('  else, so running the script again starts from turn 1 and pays again.');
  console.log('');
  process.exit(130);
});

// ─── The loop ────────────────────────────────────────────────────────────────

const MAX_TURNS = 15;

async function main(): Promise<void> {
  client = createClient();

  const question = process.argv.slice(2).join(' ').trim() || DEFAULT_QUESTION;

  console.log('Challenge 0 — an agentic loop, and nothing holding it up');
  console.log('');
  console.log(`  model      ${MODEL}`);
  console.log(`  endpoint   ${process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1 (default)'}`);
  console.log(`  question   ${question}`);
  console.log('');
  console.log('  Press Ctrl+C at any point to find out what an agent costs when it does not finish.');

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];

  let done = false;
  let answer: string | null = null;

  while (!done) {
    const response = await callModel(messages); //          ← network I/O
    if (response.toolCalls) {
      const results = await runTools(response.toolCalls); // ← network I/O
      messages.push(...results);
    } else {
      answer = response.text;
      done = true;
    }

    if (!done) {
      if (turnsStarted >= MAX_TURNS) {
        throw new Error(
          `Gave up after ${MAX_TURNS} turns without a final answer. ` +
            'Ask a narrower question, or check that the tools are returning usable data.',
        );
      }
      // See TURN_PAUSE_MS. Present only so a human can interrupt this.
      console.log(`  ...pausing ${TURN_PAUSE_MS / 1000}s so you have time to press Ctrl+C`);
      await sleep(TURN_PAUSE_MS);
    }
  }

  console.log('');
  console.log(rule('Answer'));
  console.log(answer ?? '(the model returned no text)');
  console.log('');
  console.log(rule('What that cost'));
  console.log(`  model calls        ${modelCalls}`);
  console.log(`  tool calls         ${toolCalls}`);
  console.log(`  prompt tokens      ${promptTokensTotal}`);
  console.log(`  completion tokens  ${completionTokensTotal}`);
  console.log(`  total tokens       ${tokensTotal}`);
  console.log('');
  console.log('  Run it again and you will pay all of that again. The process kept no record.');
}

main().catch((err: unknown) => {
  console.error('');
  console.error('The loop stopped:');
  console.error(`  ${err instanceof Error ? err.message : String(err)}`);
  console.error('');
  console.error(`  It had completed ${modelCalls} model call(s) and ${toolCalls} tool call(s), worth`);
  console.error(`  ${tokensTotal} token(s). None of that survives the process exiting.`);
  process.exit(1);
});
