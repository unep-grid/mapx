import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("node-fetch", () => ({ default: mocks.fetch }));

import { matchesImageSignature } from "./fetch_check.js";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const GIF_HEADER = Buffer.from("GIF89a");
const XML_BODY = Buffer.from(
  '<?xml version="1.0"?><ServiceExceptionReport></ServiceExceptionReport>',
);

describe("matchesImageSignature", () => {
  it("recognizes a PNG signature", () => {
    expect(matchesImageSignature(PNG_HEADER)).toBe(true);
  });

  it("recognizes a JPEG signature", () => {
    expect(matchesImageSignature(JPEG_HEADER)).toBe(true);
  });

  it("recognizes a GIF signature", () => {
    expect(matchesImageSignature(GIF_HEADER)).toBe(true);
  });

  it("rejects an XML error body, even if short", () => {
    expect(matchesImageSignature(XML_BODY)).toBe(false);
  });

  it("rejects an empty buffer", () => {
    expect(matchesImageSignature(Buffer.alloc(0))).toBe(false);
  });
});

// Real SSRF blocking (request-filtering-agent, wired through the actual
// unmocked node-fetch) is covered in fetch_check.ssrf.test.js — it can't
// be exercised here since node-fetch is mocked in this file.
