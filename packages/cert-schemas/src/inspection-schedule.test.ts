import { describe, expect, it } from "vitest";
import {
  INSPECTION_SCHEDULE,
  SCHEDULE_ITEMS,
  scheduleOutcome,
  scheduleSectionOf,
} from "./inspection-schedule";

describe("inspection schedule dataset", () => {
  it("has sections numbered 1 to 7 in order", () => {
    expect(INSPECTION_SCHEDULE.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("every item id is unique", () => {
    const ids = INSPECTION_SCHEDULE.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item id belongs to its section number", () => {
    for (const section of INSPECTION_SCHEDULE) {
      for (const item of section.items) {
        expect(item.id.startsWith(`${section.number}.`)).toBe(true);
      }
    }
  });

  it("every item has non-empty text", () => {
    for (const section of INSPECTION_SCHEDULE) {
      for (const item of section.items) {
        expect(item.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("covers the full condition report checklist", () => {
    const total = INSPECTION_SCHEDULE.reduce((n, s) => n + s.items.length, 0);
    expect(total).toBe(92);
    // Spot checks against the model form
    expect(SCHEDULE_ITEMS.get("4.10")?.text).toContain("RCD six-monthly test notice");
    expect(SCHEDULE_ITEMS.get("5.12.1")?.ref).toBe("411.3.3");
    expect(SCHEDULE_ITEMS.get("6.1")?.ref).toBe("701.411.3.3");
    expect(SCHEDULE_ITEMS.get("7.22")?.text).toContain("Electric vehicle");
  });

  it("scheduleSectionOf resolves items to their section", () => {
    expect(scheduleSectionOf("5.17.2")?.number).toBe(5);
    expect(scheduleSectionOf("nope")).toBeUndefined();
  });

  it("accepts only the eight model form outcomes", () => {
    for (const ok of ["ok", "C1", "C2", "C3", "FI", "LIM", "NV", "NA"]) {
      expect(scheduleOutcome.safeParse(ok).success).toBe(true);
    }
    expect(scheduleOutcome.safeParse("X").success).toBe(false);
    expect(scheduleOutcome.safeParse("c1").success).toBe(false);
  });
});
