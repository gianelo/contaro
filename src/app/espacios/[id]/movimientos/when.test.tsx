import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { isCalendarDate, type CalendarDate } from "@/domain/calendar/month";
import { When } from "./when";

/** A day the domain agrees is one, so the fixture states a real date. */
const on = (day: string): CalendarDate => {
  if (!isCalendarDate(day)) throw new Error(`${day} is not a day.`);
  return day;
};

const gian = { value: "m-gian", label: "Gian" };
const ana = { value: "m-ana", label: "Ana" };
const members = [gian, ana];

const props = {
  day: "2026-09-04",
  today: on("2026-09-04"),
  members,
  attributedTo: gian,
  onDayChange: vi.fn(),
  onMemberChange: vi.fn(),
};

describe("the day and who the money belongs to", () => {
  it("says both on one line, without asking anything", () => {
    // In the ordinary case both are already right. The line states them; it
    // does not put two fields between a person and the Save button.
    render(<When {...props} />);

    expect(screen.getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText("Gian")).toBeInTheDocument();
    expect(screen.queryByLabelText("Día")).toBeNull();
  });

  it("keeps changing them a deliberate act", async () => {
    render(<When {...props} />);

    await userEvent.click(screen.getByRole("button", { name: "Cambiar cuándo y de quién" }));

    const sheet = screen.getByRole("dialog");

    expect(within(sheet).getByLabelText("Día")).toBeInTheDocument();
    expect(within(sheet).getByLabelText("Es plata de")).toBeInTheDocument();
  });

  it("hands back the day that was chosen", async () => {
    const onDayChange = vi.fn();
    render(<When {...props} onDayChange={onDayChange} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Cambiar cuándo y de quién" }),
    );
    // fireEvent and not userEvent.type: a `type="date"` input takes a whole
    // date at once, and typing into a controlled one whose parent is a mock
    // composes it a character at a time against a value that never moves.
    fireEvent.change(screen.getByLabelText("Día"), {
      target: { value: "2026-09-01" },
    });

    expect(onDayChange).toHaveBeenLastCalledWith("2026-09-01");
  });

  it("asks nobody who the money belongs to in a Space of one", async () => {
    // The question has one answer there, and asking it is asking nothing --
    // inside the sheet as well as on the line, which is where it would hide.
    render(<When {...props} members={[gian]} />);

    expect(screen.getByText("Gian")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Cambiar cuándo y de quién" }),
    );
    const sheet = screen.getByRole("dialog");

    expect(within(sheet).getByLabelText("Día")).toBeInTheDocument();
    expect(within(sheet).queryByLabelText("Es plata de")).toBeNull();
  });

  it("carries both answers back to the form whether the sheet was opened or not", () => {
    // The sheet is not in the DOM while it is closed, so what it edits cannot
    // be what the form submits. These are.
    const { container } = render(<When {...props} />);

    expect(container.querySelector('input[name="occurredOn"]')).toHaveValue(
      "2026-09-04",
    );
    expect(container.querySelector('input[name="attributedTo"]')).toHaveValue(
      "m-gian",
    );
  });

  it("carries no attribution at all where there is nobody to choose", () => {
    // Absent rather than empty, so `recordMovement` fills in the recorder.
    const { container } = render(<When {...props} members={[gian]} />);

    expect(container.querySelector('input[name="attributedTo"]')).toBeNull();
  });
});
