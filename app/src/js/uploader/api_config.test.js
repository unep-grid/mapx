import { describe, expect, it } from "vitest";
import { buildUploadApiEnvironment, quoteShellValue } from "./api_config.js";

describe("upload API environment", () => {
  it("quotes values for safe shell assignment", () => {
    expect(quoteShellValue("a b'c")).toBe(`'a b'"'"'c'`);
  });

  it("renders the four upload variables in a stable order", () => {
    expect(
      buildUploadApiEnvironment({
        apiUrl: "https://api.example.test:8443",
        userId: 42,
        token: "secret",
        projectId: "MX-TEST",
      }),
    ).toBe(`export MAPX_API='https://api.example.test:8443'
export MAPX_USER='42'
export MAPX_TOKEN='secret'
export MAPX_PROJECT='MX-TEST'`);
  });
});
