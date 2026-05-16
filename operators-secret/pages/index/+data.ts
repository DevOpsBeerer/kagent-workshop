import { fetchOperators, type Operator } from "../../server/operators.js";

export type { Operator };

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(): Promise<{ operators: Operator[] }> {
  const operators = await fetchOperators();
  return { operators };
}
