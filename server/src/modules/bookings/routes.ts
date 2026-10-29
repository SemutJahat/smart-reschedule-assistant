import { t, type AnyElysia } from "elysia";
import { requireAuth, requireRole } from "../../plugins/auth";
import type { AuthRepository } from "../auth/schema";
import { BookingService } from "./service";

const bookingStatus = t.Union([t.Literal("booked"), t.Literal("cancelled"), t.Literal("attended"), t.Literal("no_show")]);
const bookingBody = t.Object({ scheduleId: t.String({ format: "uuid" }), subscriptionId: t.String({ format: "uuid" }) });
const bookingResponse = t.Object({
  id: t.String(), memberId: t.String(), scheduleId: t.String(), subscriptionId: t.String(), status: bookingStatus,
  bookedAt: t.String(), cancelledAt: t.Union([t.String(), t.Null()]), createdAt: t.String(), updatedAt: t.String(),
});
const bookingFilters = t.Object({ status: t.Optional(bookingStatus), date: t.Optional(t.String()) });

export function bookingRoutes(app: AnyElysia, service: BookingService, auth: AuthRepository) {
  return app
    .post("/bookings", async (context: any) => service.create(await requireAuth(context, auth), context.body), {
      beforeHandle: async (context: any) => { await requireRole(context, "customer", auth); }, body: bookingBody, response: bookingResponse,
    })
    .get("/bookings/me", async (context: any) => service.listOwn(await requireAuth(context, auth), context.query), {
      beforeHandle: async (context: any) => { await requireRole(context, "customer", auth); }, query: bookingFilters, response: t.Array(bookingResponse),
    })
    .get("/bookings", async (context: any) => service.listAdmin(context.query), {
      beforeHandle: async (context: any) => { await requireRole(context, "admin", auth); }, query: t.Object({ ...bookingFilters.properties, memberId: t.Optional(t.String({ format: "uuid" })) }), response: t.Array(bookingResponse),
    })
    .patch("/bookings/:id/cancel", async (context: any) => service.cancel(await requireAuth(context, auth), context.params.id), {
      beforeHandle: async (context: any) => { await requireAuth(context, auth); }, params: t.Object({ id: t.String({ format: "uuid" }) }), response: bookingResponse,
    });
}
