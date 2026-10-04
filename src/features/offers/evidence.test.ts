import { describe, expect, it } from "vitest";

import { validateEvidenceFile } from "./evidence";

describe("validateEvidenceFile", () => {
  it("accepts a PNG signature", async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1])], "private.png", {
      type: "image/png",
    });
    expect(await validateEvidenceFile(file)).toEqual({ mime: "image/png", extension: "png" });
  });

  it("rejects a spoofed MIME type", async () => {
    const file = new File(["not a png"], "private.png", { type: "image/png" });
    expect(await validateEvidenceFile(file)).toEqual({
      error: "The file contents do not match the selected file type.",
    });
  });
});
