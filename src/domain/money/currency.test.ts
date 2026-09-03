import { describe, expect, it } from "vitest";
import { currencyCodes, isCurrencyCode, minorUnits } from "./currency";

describe("the currency catalogue", () => {
  it("offers the currencies a Space can be denominated in", () => {
    expect(currencyCodes).toContain("ARS");
    expect(currencyCodes).toContain("USD");
  });

  it("recognises a code it offers", () => {
    expect(isCurrencyCode("ARS")).toBe(true);
  });

  it("does not recognise a code it does not offer", () => {
    expect(isCurrencyCode("XYZ")).toBe(false);
  });

  it("is not fooled by case or padding, because a picker is not the only caller", () => {
    expect(isCurrencyCode("ars")).toBe(false);
    expect(isCurrencyCode(" ARS ")).toBe(false);
  });

  it("knows how many minor units a currency divides into", () => {
    expect(minorUnits("ARS")).toBe(2);
    expect(minorUnits("CLP")).toBe(0);
  });

  it("offers COP, MXN and CAD, admitted by Members who keep money in them", () => {
    expect(currencyCodes).toContain("COP");
    expect(currencyCodes).toContain("MXN");
    expect(currencyCodes).toContain("CAD");
  });

  it("divides a Colombian peso into nothing, the way its readers write it", () => {
    // ISO 4217 says 2 and CLDR says 0; the figure follows the reader.
    expect(minorUnits("COP")).toBe(0);
  });

  it("divides a Mexican peso and a Canadian dollar into a hundred", () => {
    expect(minorUnits("MXN")).toBe(2);
    expect(minorUnits("CAD")).toBe(2);
  });

  it("has no duplicate codes", () => {
    expect(new Set(currencyCodes).size).toBe(currencyCodes.length);
  });
});
