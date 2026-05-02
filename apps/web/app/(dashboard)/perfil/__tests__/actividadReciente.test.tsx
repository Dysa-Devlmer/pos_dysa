/**
 * Unit tests — ActividadReciente (Fase 3C.2 — backed by AuditLog).
 *
 * Antes (Fase 9): el componente leía solo de `prisma.venta`. Ahora lee
 * de `prisma.auditLog` filtrado por usuario. Este test verifica el
 * contrato del componente al servidor:
 *   - Llama prisma.auditLog.findMany con el usuarioId correcto.
 *   - Aplica orderBy fecha desc + take razonable.
 *   - No invoca la query vieja a prisma.venta.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, resetMocks } from "@/test/setup";
import { ActividadReciente } from "../actividad-reciente";

beforeEach(() => {
  resetMocks();
});

describe("ActividadReciente — fuente AuditLog", () => {
  test("consulta auditLog filtrado por usuarioId, orden desc por fecha", async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([] as never);

    // Component render hace la query y devuelve JSX. Solo nos importa
    // verificar la query — no rendereamos React aquí.
    await ActividadReciente({ usuarioId: 42 });

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledTimes(1);
    const args = prismaMock.auditLog.findMany.mock.calls[0]?.[0];
    expect(args?.where).toEqual({ usuarioId: 42 });
    expect(args?.orderBy).toEqual({ fecha: "desc" });
    expect(typeof args?.take).toBe("number");
    expect(args?.take).toBeGreaterThan(0);
    // Verifica que NO consultemos la fuente vieja.
    expect(prismaMock.venta.findMany).not.toHaveBeenCalled();
  });
});
