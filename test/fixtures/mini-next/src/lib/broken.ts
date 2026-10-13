// @ts-expect-error absichtlich kaputter Import für den Test
import { nope } from "./does-not-exist";

export const value = nope;
