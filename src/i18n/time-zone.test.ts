import { describe, expect, it } from "vitest";
import { dayIn, fallbackTimeZone, timeZoneFrom } from "./time-zone";

describe("the zone a request says its Reader is in", () => {
  it("takes the one the header names", () => {
    expect(timeZoneFrom("America/Bogota")).toBe("America/Bogota");
    expect(timeZoneFrom("Europe/Madrid")).toBe("Europe/Madrid");
  });

  it("falls back when a request says nothing about where its Reader is", () => {
    expect(timeZoneFrom(null)).toBe(fallbackTimeZone);
    expect(timeZoneFrom(undefined)).toBe(fallbackTimeZone);
    expect(timeZoneFrom("")).toBe(fallbackTimeZone);
    expect(timeZoneFrom("   ")).toBe(fallbackTimeZone);
  });

  it("falls back to where the Members are, and not to Greenwich", () => {
    // UTC looks like the neutral choice and is not one: it is London with none
    // of the reasons there are for choosing Bogota (ADR-0018).
    expect(fallbackTimeZone).toBe("America/Bogota");
  });

  it("drops a zone no calendar has rather than throwing", () => {
    // A header is not code (ADR-0013/ADR-0014). A proxy sending junk must not
    // be a screen that will not render.
    for (const junk of ["Mars/Olympus_Mons", "!!!", "America/Bogotá", "0"]) {
      expect(timeZoneFrom(junk)).toBe(fallbackTimeZone);
    }
  });
});

describe("the day it is somewhere", () => {
  // Ten at night in Bogota on the 3rd is three in the morning UTC on the 4th.
  const atNight = new Date("2026-09-04T03:00:00Z");

  it("is the day on the ground and not the day at Greenwich", () => {
    expect(dayIn("America/Bogota", atNight)).toBe("2026-09-03");
    expect(dayIn("UTC", atNight)).toBe("2026-09-04");
  });

  it("reads east of Greenwich too, where the skew runs the other way", () => {
    // Noon UTC is already the next day in Kiritimati (UTC+14).
    const noon = new Date("2026-09-03T12:00:00Z");

    expect(dayIn("Pacific/Kiritimati", noon)).toBe("2026-09-04");
    expect(dayIn("UTC", noon)).toBe("2026-09-03");
  });

  it("writes every day the way a calendar writes one, leading zeros and all", () => {
    expect(dayIn("UTC", new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
  });
});
