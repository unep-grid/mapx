import { randomString } from "#mapx/helpers";

/** Generate a MapX source identifier without assuming a storage backend. */
export function newIdSource() {
  return randomString("mx", 5, 5, true, false);
}
