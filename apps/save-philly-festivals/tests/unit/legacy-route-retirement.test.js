import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { POST as saveSchedule } from "@/app/api/schedules/save/route";
import {
  DELETE as deleteSavedSchedule,
  GET as getSavedSchedules,
} from "@/app/api/schedules/saved/route";
import { POST as upload } from "@/app/api/upload/route";

const projectRoot = resolve(import.meta.dirname, "../..");
const source = (path) => readFileSync(resolve(projectRoot, path), "utf8");
const unreadableRequest = new Proxy({}, {
  get() {
    throw new Error("Retired routes must not inspect the request");
  },
});

async function expectGone(handler, replacement) {
  const response = await handler(unreadableRequest);

  expect(response.status).toBe(410);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({
    error: expect.stringContaining("retired"),
    replacement,
  });
}

describe("legacy route retirement contracts", () => {
  it("retires every legacy saved-schedule method without reading requests", async () => {
    await expectGone(saveSchedule, "/api/schedules/email");
    await expectGone(getSavedSchedules, "/calendar");
    await expectGone(deleteSavedSchedule, "/calendar");
  });

  it("retires the public upload method without reading requests", async () => {
    await expectGone(upload, "/api/producer/festivals/[id]/assets");
  });

  it("keeps retired routes independent from persistence, mail, auth, and filesystem code", () => {
    const routes = [
      source("src/app/api/schedules/save/route.js"),
      source("src/app/api/schedules/saved/route.js"),
      source("src/app/api/upload/route.js"),
    ].join("\n");

    expect(routes).not.toMatch(/@\/lib\/(db|mail|auth|uploads)|prisma|request\.(json|formData)/i);
  });
});
