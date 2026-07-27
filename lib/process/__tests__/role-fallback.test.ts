import { describe, expect, it } from "vitest";
import { resolveRoleFallback } from "@/lib/process/role-fallback";

describe("resolveRoleFallback", () => {
  it("zwraca pokrycie wprost, gdy slot jest obsadzony", () => {
    const holders = new Map([["opiekun_projektu", "user-1"]]);
    const edges = new Map([["opiekun_projektu", "wlasciciel"]]);

    expect(resolveRoleFallback("opiekun_projektu", holders, edges)).toEqual({
      coveredByRoleCode: "opiekun_projektu",
      userId: "user-1",
      via: [],
    });
  });

  it("idzie łańcuchem fallbacku, gdy slot jest pusty", () => {
    const holders = new Map([["wlasciciel", "user-owner"]]);
    const edges = new Map([["opiekun_projektu", "wlasciciel"]]);

    expect(resolveRoleFallback("opiekun_projektu", holders, edges)).toEqual({
      coveredByRoleCode: "wlasciciel",
      userId: "user-owner",
      via: ["wlasciciel"],
    });
  });

  it("idzie dwoma krokami (koordynator_operacyjny -> opiekun_projektu -> wlasciciel)", () => {
    const holders = new Map([["wlasciciel", "user-owner"]]);
    const edges = new Map([
      ["koordynator_operacyjny", "opiekun_projektu"],
      ["opiekun_projektu", "wlasciciel"],
    ]);

    expect(resolveRoleFallback("koordynator_operacyjny", holders, edges)).toEqual({
      coveredByRoleCode: "wlasciciel",
      userId: "user-owner",
      via: ["opiekun_projektu", "wlasciciel"],
    });
  });

  it("zwraca null, gdy łańcuch się kończy bez pokrycia (np. wdrozeniowiec bez fallbacku)", () => {
    const holders = new Map<string, string>();
    const edges = new Map<string, string>();

    expect(resolveRoleFallback("wdrozeniowiec", holders, edges)).toBeNull();
  });

  it("zatrzymuje się na cyklu zamiast się zapętlić (role_fallback nie ma zabezpieczenia w bazie)", () => {
    const holders = new Map<string, string>();
    const edges = new Map([
      ["a", "b"],
      ["b", "a"],
    ]);

    expect(resolveRoleFallback("a", holders, edges)).toBeNull();
  });

  it("respektuje limit głębokości", () => {
    const holders = new Map([["e", "user-e"]]);
    const edges = new Map([
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "e"],
    ]);

    expect(resolveRoleFallback("a", holders, edges, 2)).toBeNull();
    expect(resolveRoleFallback("a", holders, edges, 4)).toEqual({
      coveredByRoleCode: "e",
      userId: "user-e",
      via: ["b", "c", "d", "e"],
    });
  });
});
