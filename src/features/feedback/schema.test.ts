import { describe, expect, it } from "vitest";

import { feedbackSubmissionSchema } from "./schema";

const validSubmission = {
  type: "BUG",
  category: "MARKETPLACE",
  subject: "Search does not load",
  message: "The grouped results remained empty.",
  pageUrl: "/search",
};

describe("feedbackSubmissionSchema", () => {
  it("accepts a private app path and trims required text", () => {
    expect(feedbackSubmissionSchema.parse({
      ...validSubmission,
      subject: "  Search does not load  ",
    }).subject).toBe("Search does not load");
  });

  it("allows an empty optional category", () => {
    expect(feedbackSubmissionSchema.parse({ ...validSubmission, category: "" }).category).toBeUndefined();
  });

  it.each(["https://example.com/search", "//example.com/search", "search"])(
    "rejects non-app page URL %s",
    (pageUrl) => expect(feedbackSubmissionSchema.safeParse({ ...validSubmission, pageUrl }).success).toBe(false),
  );

  it("requires subject and message", () => {
    expect(feedbackSubmissionSchema.safeParse({ ...validSubmission, subject: "", message: "" }).success).toBe(false);
  });
});

