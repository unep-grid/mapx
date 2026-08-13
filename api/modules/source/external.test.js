import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSourceId } from "@fxi/mx_valid";

const mocks = vi.hoisted(() => ({
  getUserRoles: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgRead: { query: vi.fn() },
  pgWrite: { connect: vi.fn() },
}));
vi.mock("#mapx/authentication", () => ({
  getUserRoles: mocks.getUserRoles,
  validateTokenHandler: vi.fn(),
  validateRoleHandlerFor: vi.fn(() => vi.fn()),
}));
vi.mock("#mapx/helpers", () => ({
  randomString: vi.fn(() => "mx_abcde_fghij_klmno_pqrst_uvwxy"),
}));

import {
  createExternalMetadataSource,
  validateExternalMetadataSelection,
} from "./external.js";

const idProject = "MX-AAA-BBB-CCC-DDD-EEE";

describe("external metadata sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserRoles.mockResolvedValue({
      publisher: true,
      group: ["publishers"],
    });
  });

  it("creates a metadata-only source using server-derived roles", async () => {
    const client = {
      query: vi.fn(async (sql, values) => {
        if (String(sql).includes("RETURNING id")) {
          return {
            rows: [
              {
                id: values[0],
                pid: 42,
                project: values[2],
                type: "external",
                data: { meta: values[3] },
              },
            ],
          };
        }
        return { rows: [] };
      }),
    };
    const result = await createExternalMetadataSource(
      {
        idUser: 7,
        idProject,
        metadata: { text: { title: { en: "Remote dataset" } } },
      },
      client,
    );
    expect(result.ok).toBe(true);
    expect(result.source.type).toBe("external");
    expect(isSourceId(result.source.id)).toBe(true);
    expect(mocks.getUserRoles).toHaveBeenCalledWith(7, idProject, client);
    const insertSql = client.query.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO mx_sources"),
    )[0];
    expect(insertSql).toContain("SELECT $1::text, $2::integer");
    expect(insertSql).toContain("$3::text");
    expect(insertSql).toContain("id = $1::text");
  });

  it("rejects creation when current project roles are insufficient", async () => {
    mocks.getUserRoles.mockResolvedValue({ publisher: false, group: [] });
    await expect(
      createExternalMetadataSource(
        { idUser: 7, idProject, metadata: {} },
        { query: vi.fn() },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("accepts an empty optional selection", async () => {
    await expect(
      validateExternalMetadataSelection(
        { idUser: 7, idProject, idSource: null },
        { query: vi.fn() },
      ),
    ).resolves.toEqual({ valid: true, idSource: null });
  });

  it("accepts only an accessible external source", async () => {
    const idSource = "mx_extern_a_b_c_d_e";
    const client = {
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: idSource }] }),
    };
    await expect(
      validateExternalMetadataSelection(
        { idUser: 7, idProject, idSource },
        client,
      ),
    ).resolves.toEqual({ valid: true, idSource });
    expect(client.query.mock.calls[0][0]).toContain("s.type = 'external'");
  });
});
