import { describe, expect, it } from "vitest";
import { resolveMember, UnusableIdentityError } from "./resolve-member";

const google = {
  subject: "108422119955512345678",
  email: "ana@example.com",
  name: "Ana",
};

describe("resolving a Google identity to a Member", () => {
  it("creates a Member the first time somebody signs in", () => {
    const resolution = resolveMember(google, null);

    expect(resolution).toEqual({
      kind: "created",
      member: {
        googleSubject: "108422119955512345678",
        email: "ana@example.com",
        name: "Ana",
      },
    });
  });

  it("resolves to the Member the Google account already belongs to", () => {
    const ana = {
      id: "3f2b0c1e-0000-4000-8000-000000000001",
      googleSubject: "108422119955512345678",
      email: "ana@example.com",
      name: "Ana",
    };

    const resolution = resolveMember(google, ana);

    expect(resolution).toEqual({ kind: "unchanged", member: ana });
  });

  it("follows a name or address changed on the Google account", () => {
    const ana = {
      id: "3f2b0c1e-0000-4000-8000-000000000001",
      googleSubject: "108422119955512345678",
      email: "ana@example.com",
      name: "Ana",
    };

    const resolution = resolveMember(
      { ...google, email: "ana.gomez@example.com", name: "Ana Gómez" },
      ana,
    );

    expect(resolution).toEqual({
      kind: "refreshed",
      member: {
        id: "3f2b0c1e-0000-4000-8000-000000000001",
        googleSubject: "108422119955512345678",
        email: "ana.gomez@example.com",
        name: "Ana Gómez",
      },
    });
  });
});

describe("a Member always has something to be called", () => {
  it("falls back to the email address when Google sends no name", () => {
    const resolution = resolveMember({ ...google, name: "" }, null);

    expect(resolution.member.name).toBe("ana@example.com");
  });

  it("does not overwrite a stored name with a blank one", () => {
    const ana = {
      id: "3f2b0c1e-0000-4000-8000-000000000001",
      googleSubject: "108422119955512345678",
      email: "ana@example.com",
      name: "Ana",
    };

    const resolution = resolveMember({ ...google, name: "   " }, ana);

    expect(resolution).toEqual({ kind: "unchanged", member: ana });
  });
});

describe("an identity we cannot make a Member out of", () => {
  it("refuses one with no Google subject, rather than inventing a Member", () => {
    expect(() => resolveMember({ ...google, subject: "" }, null)).toThrow(
      UnusableIdentityError,
    );
  });

  it("refuses one with no email address", () => {
    expect(() => resolveMember({ ...google, email: "  " }, null)).toThrow(
      UnusableIdentityError,
    );
  });

  it("refuses one whose subject does not match the Member it was given", () => {
    const someoneElse = {
      id: "3f2b0c1e-0000-4000-8000-000000000002",
      googleSubject: "108422119955599999999",
      email: "beto@example.com",
      name: "Beto",
    };

    expect(() => resolveMember(google, someoneElse)).toThrow(
      UnusableIdentityError,
    );
  });
});
