import { describe, expect, it } from "vitest";
import { calculateNetBalances, equalSplit } from "@/lib/finance/balance";
import { eurosToCents, eurosToCentsSigned } from "@/lib/finance/money";

describe("money",()=>{it("converts Spanish amounts without floating point storage",()=>{expect(eurosToCents("1.540,25")).toBe(154025)});it("rejects zero and invalid values",()=>{expect(()=>eurosToCents("0")).toThrow();expect(()=>eurosToCents("hola")).toThrow()})});
describe("signed money",()=>{
  it("accepts positive, negative and zero amounts",()=>{
    expect(eurosToCentsSigned("1.540,25")).toBe(154025);
    expect(eurosToCentsSigned("-42,50")).toBe(-4250);
    expect(eurosToCentsSigned("0")).toBe(0);
  });
  it("rejects invalid formats",()=>{
    expect(()=>eurosToCentsSigned("hola")).toThrow();
    expect(()=>eurosToCentsSigned("--5")).toThrow();
  });
});
describe("shared expenses",()=>{it("splits odd cents without losing money",()=>{const split=equalSplit(1001,["a","b"]);expect(split).toEqual([{userId:"a",amountCents:501},{userId:"b",amountCents:500}]);expect(split.reduce((s,x)=>s+x.amountCents,0)).toBe(1001)});it("calculates who should compensate whom",()=>{expect(calculateNetBalances([{paidBy:"a",amountCents:6000,splits:[{userId:"a",amountCents:3000},{userId:"b",amountCents:3000}]}])).toEqual({a:3000,b:-3000})})});
