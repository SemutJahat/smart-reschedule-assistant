import { t, type AnyElysia } from "elysia";
import { requireAuth } from "../../plugins/auth";
import { MemberService } from "./service";

const memberPatch = t.Object({
  phone: t.Optional(t.Union([t.String(), t.Null()])),
  emergencyContact: t.Optional(t.Union([t.String(), t.Null()])),
  weight: t.Optional(t.Union([t.String(), t.Null()])),
  height: t.Optional(t.Union([t.String(), t.Null()])),
  bloodType: t.Optional(t.Union([t.String(), t.Null()])),
  medicalHistory: t.Optional(t.Union([t.String(), t.Null()])),
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("inactive"), t.Literal("suspended")])),
});

export function memberRoutes(app: AnyElysia, service: MemberService) {
  return app
    .get("/members/me", async (context: any) => service.getForUser(await requireAuth(context)), { response: t.Any() })
    .get("/members", async (context: any) => service.list(await requireAuth(context)), { response: t.Any() })
    .get("/members/:id", async (context: any) => service.getById(await requireAuth(context), context.params.id), { response: t.Any() })
    .patch("/members/:id", async (context: any) => service.update(await requireAuth(context), context.params.id, context.body), { body: memberPatch, response: t.Any() });
}
