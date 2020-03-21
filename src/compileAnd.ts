import { beautify } from "./beautify";
import { handleSchema } from "./handleSchema";
import { toContext } from "./toContext";
import { CompilationResult, Prepare, Schema } from "./types";

function compileAndVariantElementToReturnWay(
  c: (schema: Schema) => CompilationResult,
  index: number,
  valueId: string,
  ctxId: string,
  schema: Schema,
  preparations: Prepare[],
  primitives: any[]
): string {
  return handleSchema({
    constant: constant => {
      if (primitives.indexOf(constant) < 0) {
        primitives.push(constant);
      }

      return "";
    },
    function: funcSchema => {
      const s = funcSchema();
      if (s.prepare) {
        preparations.push(s.prepare);
      }
      const notCheck = s.not
        ? s.not(valueId, ctxId)
        : `!(${s.check(valueId, ctxId)})`;
      return s.handleError
        ? beautify(`if (${notCheck}) {
                  ${s.handleError(valueId, ctxId)}
                  return false
                }`)
        : `if (${notCheck}) return false`;
    },
    object: objectSchema => {
      const compiled = c(objectSchema);
      const [id, prepare] = toContext(index, compiled);
      preparations.push(prepare);
      return compileAndVariantElementToReturnWay(
        c,
        index,
        valueId,
        ctxId,
        () => ({
          check: () => `${ctxId}['${id}'](${valueId})`,
          handleError: () =>
            `${ctxId}.explanations.push(...${ctxId}['${id}'].explanations)`,
          not: () => `!${ctxId}['${id}'](${valueId})`
        }),
        preparations,
        primitives
      );
    },
    objectRest: objectSchema => {
      const compiled = c(objectSchema);
      const [id, prepare] = toContext(index, compiled);
      preparations.push(prepare);
      return compileAndVariantElementToReturnWay(
        c,
        index,
        valueId,
        ctxId,
        () => ({
          check: () => `${ctxId}['${id}'](${valueId})`,
          handleError: () =>
            `${ctxId}.explanations.push(...${ctxId}['${id}'].explanations)`,
          not: () => `!${ctxId}['${id}'](${valueId})`
        }),
        preparations,
        primitives
      );
    },
    variant: schemas => {
      if (schemas.length === 0) {
        return `return false`;
      }
      if (schemas.length === 1) {
        return compileAndVariantElementToReturnWay(
          c,
          index,
          valueId,
          ctxId,
          schemas[0],
          preparations,
          primitives
        );
      }
      const compiled = c(schemas);
      const [id, prepare] = toContext(index, compiled);
      preparations.push(prepare);
      return compileAndVariantElementToReturnWay(
        c,
        index,
        valueId,
        ctxId,
        () => ({
          check: () => `${ctxId}['${id}'](${valueId})`,
          handleError: () =>
            `${ctxId}.explanations.push(...${ctxId}['${id}'].explanations)`,
          not: () => `!${ctxId}['${id}'](${valueId})`
        }),
        preparations,
        primitives
      );
    }
  })(schema);
}

export function compileAnd(
  c: (schema: Schema) => CompilationResult,
  schemas: Schema[]
): CompilationResult {
  if (schemas.length === 0) {
    return Object.assign(() => true, { explanations: [] });
  }
  if (schemas.length === 1) {
    return c(schemas[0]);
  }

  const preparations: Prepare[] = [];
  const bodyCode = [];
  const primitives: any[] = [];
  for (let i = 0; i < schemas.length; i++) {
    const schema = schemas[i];
    bodyCode.push(
      compileAndVariantElementToReturnWay(
        c,
        i,
        `value`,
        `validator`,
        schema,
        preparations,
        primitives
      )
    );
    if (primitives.length > 1) {
      return Object.assign(() => false, { explanations: [] });
    }
  }
  if (primitives.length === 1) {
    return c(primitives[0]);
  }

  // tslint:disable-next-line
  const ctx = eval(
    beautify(`(() => {
      function validator(value) {
        validator.explanations = []
        ${bodyCode
          .map(e => e.trim())
          .filter(Boolean)
          .join("\n")}
        return true
      }
      return validator
    })()`)
  );
  for (const prepare of preparations) {
    prepare(ctx);
  }
  ctx.explanations = [];
  return ctx as any;
}
