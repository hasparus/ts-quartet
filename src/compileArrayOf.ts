import { addTabs } from "./addTabs";
import { getKeyAccessor } from "./getKeyAccessor";
import { handleSchema } from "./handleSchema";
import { toContext } from "./toContext";
import {
  CompilationResult,
  Prepare,
  Schema,
  TypedCompilationResult
} from "./types";

function compileForLoopBody(
  c: (schema: Schema) => CompilationResult,
  schema: Schema,
  preparations: Prepare[]
): [string, boolean] {
  return handleSchema<[string, boolean]>({
    constant: constant => {
      if (constant === null) {
        return [`if (elem !== null) return false`, true];
      }
      if (constant === undefined) {
        return [`if (elem !== undefined) return false`, true];
      }
      if (typeof constant === "number") {
        if (Number.isNaN(constant)) {
          return [`if (!Number.isNaN(elem)) return false`, true];
        }
        return [`if (elem !== ${constant}) return false`, true];
      }
      if (constant === "true" || constant === "false") {
        return [`if (elem !== '${constant}') return false`, true];
      }
      if (typeof constant === "symbol") {
        const [symbolId, prepare] = toContext("symbol", constant, true);
        const symbolAccessor = getKeyAccessor(symbolId);

        preparations.push(prepare);
        return [`if (elem !== validator${symbolAccessor}) return false`, true];
      }
      return [`if (elem !== ${JSON.stringify(constant)}) return false`, true];
    },
    function: funcSchema => {
      const s = funcSchema();
      if (s.prepare) {
        preparations.push(s.prepare);
      }
      const notCheck = s.not
        ? s.not("elem", "validator")
        : `!(${s.check("elem", "validator")})`;
      return [
        s.handleError
          ? `if (${notCheck}) {\n${addTabs(
              s.handleError("elem", "validator")
            )}\n  return false\n}`
          : `if (${notCheck}) return false`,
        !s.handleError
      ];
    },
    object: objectSchema => {
      const compiled = c(objectSchema);
      const [id, prepare] = toContext("object", compiled, true);
      const objAccesor = getKeyAccessor(id);
      preparations.push(prepare);
      const funcSchema = compiled.pure
        ? () => ({
            check: () => `validator${objAccesor}(elem)`,
            not: () => `!validator${objAccesor}(elem)`
          })
        : () => ({
            check: () => `validator${objAccesor}(elem)`,
            handleError: () =>
              `validator.explanations.push(...validator${objAccesor}.explanations)`,
            not: () => `!validator${objAccesor}(elem)`
          });
      return compileForLoopBody(c, funcSchema, preparations);
    },
    objectRest: objectSchema => {
      const compiled = c(objectSchema);
      const [id, prepare] = toContext("object", compiled, true);
      const idAccessor = getKeyAccessor(id);
      preparations.push(prepare);
      const funcSchema = compiled.pure
        ? () => ({
            check: () => `validator${idAccessor}(elem)`,
            not: () => `!validator${idAccessor}(elem)`
          })
        : () => ({
            check: () => `validator${idAccessor}(elem)`,
            handleError: () =>
              `validator.explanations.push(...validator${idAccessor}.explanations)`,
            not: () => `!validator${idAccessor}(elem)`
          });
      return compileForLoopBody(c, funcSchema, preparations);
    },
    variant: schemas => {
      if (schemas.length === 0) {
        return [`return false`, true];
      }
      if (schemas.length === 1) {
        return compileForLoopBody(c, schemas[0], preparations);
      }
      const compiled = c(schemas);
      const [id, prepare] = toContext("variant", compiled, true);
      const idAccessor = getKeyAccessor(id);
      preparations.push(prepare);
      const funcSchema = compiled.pure
        ? () => ({
            check: () => `validator${idAccessor}(elem)`,
            not: () => `!validator${idAccessor}(elem)`
          })
        : () => ({
            check: () => `validator${idAccessor}(elem)`,
            handleError: () =>
              `validator.explanations.push(...validator${idAccessor}.explanations)`,
            not: () => `!validator${idAccessor}(elem)`
          });
      return compileForLoopBody(c, funcSchema, preparations);
    }
  })(schema);
}

export function arrayOf<T = any>(
  c: (schema: Schema) => CompilationResult,
  schema: Schema
): TypedCompilationResult<T> {
  const preparations: Prepare[] = [];
  const [forLoopBody, pure] = compileForLoopBody(c, schema, preparations);

  const code = `
    (() => {function validator(value) {${
      pure ? "" : "\n  validator.explanations = []"
    }\n  if (!value || !Array.isArray(value)) return false\n  for (let i = 0; i < value.length; i++) {\n    const elem = value[i]\n${addTabs(
    forLoopBody,
    2
  )}\n  }\n  return true\n}
        return validator
    })()
  `.trim();

  // tslint:disable-next-line
  const ctx = eval(code);

  for (const prepare of preparations) {
    prepare(ctx);
  }

  ctx.explanations = [];

  return ctx;
}
