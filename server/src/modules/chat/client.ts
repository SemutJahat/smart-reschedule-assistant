import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { AppConfig } from "../../config/env";
import { AppError } from "../../shared/errors";
import {
  CHAT_INTENTS,
  CHAT_UUID_PATTERN,
  type ChatContext,
  type GenAiAnalysis,
} from "./schema";

/** Maximum reply size accepted from the provider and exposed through the API. */
export const MAX_GEN_AI_REPLY_LENGTH = 2_000;

export interface GenAiClient {
  analyze(context: ChatContext): Promise<GenAiAnalysis>;
}

const GenAiAnalysisSchema = Type.Object({
  intent: Type.Union(CHAT_INTENTS.map((intent) => Type.Literal(intent))),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  extracted: Type.Record(Type.String(), Type.Unknown()),
  // Keep UUID validation local to this schema. Value.Check does not inherit
  // Elysia's format registry when used as a framework-independent validator.
  recommendedScheduleIds: Type.Array(Type.RegExp(CHAT_UUID_PATTERN)),
  reply: Type.String({ minLength: 1, maxLength: MAX_GEN_AI_REPLY_LENGTH }),
  nextState: Type.Union([
    Type.Literal("active"),
    Type.Literal("awaiting_confirmation"),
    Type.Literal("submitted"),
  ]),
  model: Type.String({ minLength: 1 }),
  modelVersion: Type.String({ minLength: 1 }),
}, { additionalProperties: false });

type ValidatedGenAiAnalysis = Static<typeof GenAiAnalysisSchema>;

const AI_UNAVAILABLE_MESSAGE = "The AI service is temporarily unavailable";
const AI_INVALID_RESPONSE_MESSAGE = "The AI service returned an invalid response";

function unavailable(error?: unknown): AppError {
  // Deliberately do not include the provider error: it may contain credentials,
  // request content, or other sensitive transport details.
  return new AppError("AI_SERVICE_UNAVAILABLE", AI_UNAVAILABLE_MESSAGE, 503);
}

function invalidResponse(): AppError {
  // Deliberately do not include provider response bodies in this error.
  return new AppError("AI_INVALID_RESPONSE", AI_INVALID_RESPONSE_MESSAGE, 502);
}

function validateAnalysis(value: unknown): GenAiAnalysis {
  if (!Value.Check(GenAiAnalysisSchema, value)) throw invalidResponse();
  const response = value as ValidatedGenAiAnalysis;
  if (response.reply.trim() === "" || response.model.trim() === "" || response.modelVersion.trim() === "") {
    throw invalidResponse();
  }
  return response;
}

export class StubGenAiClient implements GenAiClient {
  async analyze(context: ChatContext): Promise<GenAiAnalysis> {
    const candidate = context.candidateSchedules[0];
    if (candidate) {
      return {
        intent: "Reschedule",
        confidence: 0.99,
        extracted: {},
        recommendedScheduleIds: [candidate.schedule.id],
        reply: "Please confirm the proposed schedule.",
        nextState: "awaiting_confirmation",
        model: "deterministic-stub",
        modelVersion: "v1",
      };
    }
    return {
      intent: "Other",
      confidence: 0.99,
      extracted: {},
      recommendedScheduleIds: [],
      reply: "I couldn't find an available schedule matching your request.",
      nextState: "active",
      model: "deterministic-stub",
      modelVersion: "v1",
    };
  }
}

export interface GenAiHttpClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetchImpl?: FetchLike;
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class HttpGenAiClient implements GenAiClient {
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: GenAiHttpClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async analyze(context: ChatContext): Promise<GenAiAnalysis> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.options.baseUrl.replace(/\/+$/, "")}/analyze`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({ model: this.options.model, context }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      throw unavailable(error);
    }

    if (!response.ok) throw invalidResponse();

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw invalidResponse();
    }
    return validateAnalysis(payload);
  }
}

export function createGenAiClient(config: Pick<AppConfig, "genAiMode" | "genAiBaseUrl" | "genAiApiKey" | "genAiModel" | "genAiTimeoutMs">, fetchImpl?: FetchLike): GenAiClient {
  if (config.genAiMode === "stub") return new StubGenAiClient();
  if (!config.genAiBaseUrl || !config.genAiApiKey) {
    throw new Error("HTTP Gen AI client requires a base URL and API key");
  }
  return new HttpGenAiClient({
    baseUrl: config.genAiBaseUrl,
    apiKey: config.genAiApiKey,
    model: config.genAiModel,
    timeoutMs: config.genAiTimeoutMs,
    fetchImpl,
  });
}

/** `submitted` is provider-schema-valid, but ChatService must reject it until confirmation. */
export { GenAiAnalysisSchema };
