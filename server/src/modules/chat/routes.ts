import { t, type AnyElysia } from "elysia";
import { requireAuth, requireRole } from "../../plugins/auth";
import type { AuthRepository } from "../auth/schema";
import { MAX_GEN_AI_REPLY_LENGTH } from "./client";
import type { ChatService } from "./service";

const dateTime = t.String({ format: "date-time" });
const uuid = t.String({ format: "uuid" });
const sessionStatus = t.Union([
  t.Literal("active"),
  t.Literal("awaiting_confirmation"),
  t.Literal("submitted"),
  t.Literal("closed"),
]);
const chatIntent = t.Union([
  t.Literal("Reschedule"),
  t.Literal("Cancel"),
  t.Literal("Schedule inquiry"),
  t.Literal("Confirmation"),
  t.Literal("Other"),
]);
const messageRole = t.Union([t.Literal("user"), t.Literal("assistant"), t.Literal("system")]);

const sessionResponse = t.Object({
  id: uuid,
  bookingId: uuid,
  status: sessionStatus,
  currentIntent: t.Union([chatIntent, t.Null()]),
  proposedScheduleId: t.Union([uuid, t.Null()]),
  confirmedAt: t.Union([dateTime, t.Null()]),
  createdAt: dateTime,
  updatedAt: dateTime,
});

const messageResponse = t.Object({
  id: uuid,
  role: messageRole,
  content: t.String(),
  sequence: t.Integer(),
  createdAt: dateTime,
});

const analysisResponse = t.Object({
  intent: chatIntent,
  confidence: t.Number({ minimum: 0, maximum: 1 }),
  extractedData: t.Record(t.String(), t.Unknown()),
  recommendedScheduleIds: t.Array(uuid),
  reply: t.String({ minLength: 1, maxLength: MAX_GEN_AI_REPLY_LENGTH }),
  nextState: t.Union([t.Literal("active"), t.Literal("awaiting_confirmation"), t.Literal("submitted")]),
  model: t.String({ minLength: 1 }),
  modelVersion: t.String({ minLength: 1 }),
  createdAt: dateTime,
});

const turnResponse = t.Object({
  session: sessionResponse,
  message: messageResponse,
  assistantMessage: messageResponse,
  analysis: analysisResponse,
});

const bookingResponse = t.Object({
  id: uuid,
  scheduleId: uuid,
  status: t.Union([t.Literal("booked"), t.Literal("cancelled"), t.Literal("attended"), t.Literal("no_show")]),
  bookedAt: dateTime,
  cancelledAt: t.Union([dateTime, t.Null()]),
  createdAt: dateTime,
  updatedAt: dateTime,
});

const requestResponse = t.Object({
  id: uuid,
  bookingId: uuid,
  chatSessionId: t.Union([uuid, t.Null()]),
  fromScheduleId: uuid,
  toScheduleId: uuid,
  customerMessage: t.Union([t.String(), t.Null()]),
  status: t.Union([
    t.Literal("pending"),
    t.Literal("held"),
    t.Literal("approved"),
    t.Literal("rejected"),
    t.Literal("cancelled"),
  ]),
  createdAt: dateTime,
  updatedAt: dateTime,
});

const confirmationResponse = t.Object({
  request: requestResponse,
  booking: bookingResponse,
});

const sessionParams = t.Object({ id: uuid });
const createSessionBody = t.Object({ bookingId: uuid });
const sendMessageBody = t.Object({
  message: t.String({ minLength: 1, maxLength: MAX_GEN_AI_REPLY_LENGTH }),
  clientMessageId: t.Optional(uuid),
});
const confirmBody = t.Object({ scheduleId: uuid });
export function chatRoutes(app: AnyElysia, service: ChatService, auth: AuthRepository) {
  return app
    .post("/chat/sessions", async (context) => { context.set.status = 201; return service.createSession(await requireAuth({ jwt: context.jwt, headers: context.headers }, auth), context.body.bookingId); }, {
      beforeHandle: async (context) => { await requireRole({ jwt: context.jwt, headers: context.headers }, "customer", auth); },
      body: createSessionBody,
      response: sessionResponse,
    })
    .post("/chat/sessions/:id/messages", async (context) => service.sendMessage(await requireAuth({ jwt: context.jwt, headers: context.headers }, auth), context.params.id, context.body), {
      beforeHandle: async (context) => { await requireRole({ jwt: context.jwt, headers: context.headers }, "customer", auth); },
      params: sessionParams,
      body: sendMessageBody,
      response: turnResponse,
    })
    .post("/chat/sessions/:id/confirm", async (context) => { context.set.status = 201; return service.confirmSchedule(await requireAuth({ jwt: context.jwt, headers: context.headers }, auth), context.params.id, context.body.scheduleId); }, {
      beforeHandle: async (context) => { await requireRole({ jwt: context.jwt, headers: context.headers }, "customer", auth); },
      params: sessionParams,
      body: confirmBody,
      response: confirmationResponse,
    })
    .get("/chat/sessions/:id", async (context) => service.getSession(await requireAuth({ jwt: context.jwt, headers: context.headers }, auth), context.params.id), {
      beforeHandle: async (context) => { await requireRole({ jwt: context.jwt, headers: context.headers }, "customer", auth); },
      params: sessionParams,
      response: sessionResponse,
    })
    .get("/chat/sessions/:id/messages", async (context) => service.getMessages(await requireAuth({ jwt: context.jwt, headers: context.headers }, auth), context.params.id), {
      beforeHandle: async (context) => { await requireRole({ jwt: context.jwt, headers: context.headers }, "customer", auth); },
      params: sessionParams,
      response: t.Array(messageResponse),
    });
}
