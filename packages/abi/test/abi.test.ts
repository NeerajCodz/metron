import { describe, expect, it } from "vitest";
import { getAbi } from "../index.js";

describe("generated ABIs", () => {
  it("exposes compiled contract methods", () => {
    const abi = getAbi("IntentManager");
    expect(abi.some((item) => item["name"] === "submitIntent")).toBe(true);
  });

  it("rejects contracts absent from the generated manifest", () => {
    expect(() => getAbi("UnknownContract")).toThrow("ABI not generated");
  });
});
