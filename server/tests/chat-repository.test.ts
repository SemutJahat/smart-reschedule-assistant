import { expect, test } from "bun:test";
import { InMemoryChatRepository } from "../src/modules/chat/repository";
import { InMemoryChatTransactionCoordinator } from "../src/modules/chat/unit-of-work";
import { InMemoryBookingRepository } from "../src/modules/bookings/repository";
import { InMemoryCatalogRepository } from "../src/modules/coaches/schema";
import { InMemoryPaymentRepository } from "../src/modules/payments/repository";
import { InMemoryRescheduleRepository } from "../src/modules/reschedules/repository";

const session = { memberId: "member", bookingId: "booking", currentIntent: null as null };

test("chat repository allocates sequences and finds client messages", async () => {
  const repository = new InMemoryChatRepository();
  const created = await repository.insertSession(session);
  expect(await repository.nextMessageSequence(created.id)).toBe(1);
  const message = await repository.insertMessage({ sessionId: created.id, sequence: 1, role: "user", content: "hello", clientMessageId: "client-1" });
  expect(await repository.nextMessageSequence(created.id)).toBe(2);
  expect(await repository.findMessageByClientId(created.id, "client-1")).toEqual(message);
  await expect(repository.insertMessage({ sessionId: created.id, sequence: 1, role: "user", content: "duplicate" })).rejects.toMatchObject({ code: "23505", constraint_name: "chat_messages_session_sequence_uidx" });
});

test("chat repository enforces session, client id, and analysis uniqueness", async () => {
  const repository = new InMemoryChatRepository();
  const created = await repository.insertSession(session);
  await expect(repository.insertSession(session)).rejects.toMatchObject({ code: "23505", constraint_name: "chat_sessions_active_member_booking_uidx" });
  await repository.updateSession(created.id, { status: "closed" });
  const reopened = await repository.insertSession(session);
  const message = await repository.insertMessage({ sessionId: reopened.id, sequence: 1, role: "user", content: "hello", clientMessageId: "client-2" });
  await expect(repository.insertMessage({ sessionId: reopened.id, sequence: 2, role: "user", content: "again", clientMessageId: "client-2" })).rejects.toMatchObject({ code: "23505", constraint_name: "chat_messages_session_client_message_uidx" });
  await repository.insertAnalysis({ messageId: message.id, status: "completed", intent: "Other", confidence: 0.5, extractedData: { nested: { ok: true } }, recommendedScheduleIds: [], reply: "ok", nextState: "active", model: "test", modelVersion: "1" });
  expect(await repository.findAnalysisByMessageId(message.id)).toMatchObject({ confidence: 0.5, extractedData: { nested: { ok: true } } });
  await expect(repository.insertAnalysis({ messageId: message.id, status: "completed", intent: "Other", confidence: 0.5, extractedData: {}, recommendedScheduleIds: [], reply: "ok", nextState: "active", model: "test", modelVersion: "1" })).rejects.toMatchObject({ code: "23505", constraint_name: "chat_message_analyses_message_uidx" });
});

test("chat repository transactions roll back all chat data", async () => {
  const repository = new InMemoryChatRepository();
  await expect(repository.transaction(async (tx) => {
    const created = await tx.insertSession(session);
    const message = await tx.insertMessage({ sessionId: created.id, sequence: 1, role: "user", content: "hello" });
    await tx.insertAnalysis({ messageId: message.id, status: "pending", intent: "Other", confidence: 0, extractedData: {}, recommendedScheduleIds: [], reply: "", nextState: "active", model: "test", modelVersion: "1" });
    throw new Error("rollback");
  })).rejects.toThrow("rollback");
  expect(repository.sessions).toHaveLength(0); expect(repository.messages).toHaveLength(0); expect(repository.analyses).toHaveLength(0);
});

test("reschedule records preserve their chat session link", async () => {
  const catalog = new InMemoryCatalogRepository();
  const payment = new InMemoryPaymentRepository(catalog);
  const booking = new InMemoryBookingRepository(catalog, payment);
  const reschedule = new InMemoryRescheduleRepository(booking, catalog);
  const request = await reschedule.insertRequest({ bookingId: "booking", memberId: "member", chatSessionId: "session", fromScheduleId: "source", toScheduleId: "target", customerMessage: "move" });
  expect(request.chatSessionId).toBe("session");
  expect((await reschedule.findRequest(request.id))?.chatSessionId).toBe("session");
});

test("the in-memory coordinator rolls back all shared state atomically", async () => {
  const catalog = new InMemoryCatalogRepository();
  const payment = new InMemoryPaymentRepository(catalog);
  const booking = new InMemoryBookingRepository(catalog, payment);
  const reschedule = new InMemoryRescheduleRepository(booking, catalog);
  const chat = new InMemoryChatRepository();
  const coordinator = new InMemoryChatTransactionCoordinator({ chat, reschedule, booking, payment, catalog });
  await expect(coordinator.transaction(async (tx) => {
    const created = await tx.chat.insertSession(session);
    await tx.booking.insertBooking({ memberId: session.memberId, scheduleId: "source", subscriptionId: "subscription" });
    await tx.payment.insertSubscription({ memberId: session.memberId, packageId: "package", status: "active", startsAt: new Date(), expiresAt: new Date(), totalSessions: 1, usedSessions: 0, amountPaid: "1" });
    await tx.reschedule.insertRequest({ bookingId: "booking", memberId: session.memberId, chatSessionId: created.id, fromScheduleId: "source", toScheduleId: "target", customerMessage: "move" });
    throw new Error("atomic rollback");
  })).rejects.toThrow("atomic rollback");
  expect(chat.sessions).toHaveLength(0); expect(reschedule.requests).toHaveLength(0); expect(booking.bookings).toHaveLength(0); expect(payment.subscriptions).toHaveLength(0); expect(catalog.bookings).toHaveLength(0);
});
