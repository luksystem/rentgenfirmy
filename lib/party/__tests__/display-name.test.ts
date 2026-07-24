import { describe, expect, it } from "vitest";
import { formatPartyName, partyToServiceClientName } from "@/lib/party/display-name";

describe("partyToServiceClientName", () => {
  it("zwraca imię i nazwisko, nie tylko nazwisko", () => {
    expect(partyToServiceClientName({ firstName: "Karolina i Michał", lastName: "Dębowska" })).toBe(
      "Karolina i Michał Dębowska",
    );
  });

  it("zgadza się z formatPartyName", () => {
    const input = { firstName: "Jan", lastName: "Kowalski" };
    expect(partyToServiceClientName(input)).toBe(formatPartyName(input));
  });
});
