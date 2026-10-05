import { describe, expect, it } from "vitest";

import { containsSensitiveContent } from "./sensitive-content";

describe("containsSensitiveContent", () => {
  it.each([
    "card 4242 4242 4242 4242",
    "CVV: 123",
    "SSN 123-45-6789",
    "password: hunter2",
    "routing number 123456789",
  ])("blocks obvious sensitive content: %s", (content) => {
    expect(containsSensitiveContent(content)).toBe(true);
  });

  it("allows ordinary marketplace messages", () => {
    expect(containsSensitiveContent("Hi, is this Adobe listing still available?")).toBe(false);
  });
});
