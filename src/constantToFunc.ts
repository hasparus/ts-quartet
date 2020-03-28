import { getKeyAccessor } from "./getKeyAccessor";
import { toContext } from "./toContext";
import { ConstantSchema, FunctionSchema } from "./types";

export function constantToFunc(c: ConstantSchema): FunctionSchema {
  if (c === undefined) {
    return () => ({
      check: id => `${id} === undefined`,
      not: id => `${id} !== undefined`
    });
  }
  if (c === null) {
    return () => ({
      check: id => `${id} === null`,
      not: id => `${id} !== null`
    });
  }
  if (typeof c === "boolean") {
    return () => ({
      check: id => `${id} === ${c}`,
      not: id => `${id} !== ${c}`
    });
  }
  if (typeof c === "string") {
    return () => ({
      check: id => `${id} === ${JSON.stringify(c)}`,
      not: id => `${id} !== ${JSON.stringify(c)}`
    });
  }
  if (typeof c === "number") {
    return Number.isNaN(c)
      ? () => ({
          check: id => `Number.isNaN(${id})`,
          not: id => `!Number.isNaN(${id})`
        })
      : () => ({
          check: id => `${id} === ${c}`,
          not: id => `${id} !== ${c}`
        });
  }
  const [cId, prepare] = toContext("constant", c);
  const constantAccessor = getKeyAccessor(cId);
  return () => ({
    check: (id, ctx) => `${id} === ${ctx}${constantAccessor}`,
    not: (id, ctx) => `${id} !== ${ctx}${constantAccessor}`,
    prepare
  });
}
