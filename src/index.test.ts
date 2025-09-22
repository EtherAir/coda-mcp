import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "./index";
import { server } from "./server";

const originalApiKey = process.env.API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.API_KEY;
  } else {
    process.env.API_KEY = originalApiKey;
  }

  vi.restoreAllMocks();
});

describe("main", () => {
  it("rejects when API_KEY environment variable is missing", async () => {
    delete process.env.API_KEY;

    const connectSpy = vi.spyOn(server, "connect");

    await expect(main()).rejects.toThrowError(
      /API_KEY environment variable is required/i,
    );
    expect(connectSpy).not.toHaveBeenCalled();
  });
});
