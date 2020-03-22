import { beautify } from "./beautify";
import { getKeyAccessor } from "./getKeyAccessor";
import { handleSchema } from "./handleSchema";
import { toContext } from "./toContext";
import { CompilationResult, IObjectSchema, Prepare, Schema } from "./types";

function compilePropValidationWithoutRest(
  c: (schema: Schema) => CompilationResult,
  key: string,
  valueId: string,
  ctxId: string,
  schema: Schema,
  preparations: Prepare[],
  stringNumbersSymbols: Array<string | number | symbol>
): string {
  return handleSchema({
    constant: constant => {
      if (constant === null) {
        return `if (${valueId} !== null) return false`;
      }
      if (constant === undefined) {
        return `if (${valueId} !== undefined) return false`;
      }
      if (typeof constant === "number") {
        if (Number.isNaN(constant)) {
          return `if (!Number.isNaN(${valueId})) return false`;
        }
        return `if (${valueId} !== ${constant}) return false`;
      }
      if (constant === "true" || constant === "false") {
        return `if (${valueId} !== '${constant}') return false`;
      }
      if (typeof constant === "symbol" || typeof constant === "string") {
        stringNumbersSymbols.push(constant);
        return "";
      }
      return `if (${valueId} !== ${JSON.stringify(constant)}) return false`;
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
      const keys = Object.keys(objectSchema);
      const codeLines = [`if (!${valueId}) return false`];
      const important: string[] = [];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const keyAccessor = getKeyAccessor(key);
        const keyValidValues: Array<string | symbol> = [];
        const keyId = valueId + keyAccessor;
        const code = compilePropValidationWithoutRest(
          c,
          key,
          keyId,
          ctxId,
          objectSchema[key],
          preparations,
          keyValidValues
        );

        if (keyValidValues.length > 0) {
          for (const valid of keyValidValues) {
            const [keyConstantId, prepare] = toContext(keyId, valid);
            preparations.push(prepare);
            important.push(
              `if (${keyId} !== ${ctxId}['${keyConstantId}']) return false`
            );
          }
        }
        if (code) {
          codeLines.push(code);
        }
      }
      codeLines.splice(1, 0, ...important);
      return codeLines.join("\n");
    },
    objectRest: objectSchema => {
      const compiled = c(objectSchema);
      const [id, prepare] = toContext(key, compiled);
      preparations.push(prepare);
      return compilePropValidationWithoutRest(
        c,
        key,
        valueId,
        ctxId,
        () => ({
          check: () => `${ctxId}['${id}'](${valueId})`,
          handleError: () =>
            `${ctxId}.explanations.push(...${ctxId}['${id}'].explanations)`,
          not: () => `!${ctxId}['${id}'](${valueId})`
        }),
        preparations,
        stringNumbersSymbols
      );
    },
    variant: schemas => {
      if (schemas.length === 0) {
        return `return false`;
      }
      if (schemas.length === 1) {
        return compilePropValidationWithoutRest(
          c,
          key,
          valueId,
          ctxId,
          schemas[0],
          preparations,
          stringNumbersSymbols
        );
      }
      const compiled = c(schemas);
      const [id, prepare] = toContext(key, compiled);
      preparations.push(prepare);
      return compilePropValidationWithoutRest(
        c,
        key,
        valueId,
        ctxId,
        () => ({
          check: () => `${ctxId}['${id}'](${valueId})`,
          handleError: () =>
            `${ctxId}.explanations.push(...${ctxId}['${id}'].explanations)`,
          not: () => `!${ctxId}['${id}'](${valueId})`
        }),
        preparations,
        stringNumbersSymbols
      );
    }
  })(schema);
}

export function compileObjectSchema(
  c: (schema: Schema) => CompilationResult,
  s: IObjectSchema
) {
  const keys = Object.keys(s);
  if (keys.length === 0) {
    return Object.assign((value: any) => value, { explanations: [] });
  }
  const bodyCodeLines = [];
  const preparations: Prepare[] = [];
  const ctxId = "validator";
  const validValues: Record<string, Record<string, true>> = {};
  const withValidValues: string[] = [];
  // tslint:disable-next-line
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const schema = s[key];
    const keyAccessor = getKeyAccessor(key);
    const valueId = `value${keyAccessor}`;
    const keyValidValues: any[] = [];
    bodyCodeLines.push(
      compilePropValidationWithoutRest(
        c,
        key,
        valueId,
        ctxId,
        schema,
        preparations,
        keyValidValues
      )
    );
    if (keyValidValues.length > 0) {
      withValidValues.push(key);
      if (!validValues[key]) {
        validValues[key] = {};
      }
      for (const valid of keyValidValues) {
        validValues[key][valid] = true;
      }
    }
  }

  if (withValidValues.length > 0) {
    preparations.push(context => {
      context.__validValues = validValues;
    });
    bodyCodeLines.unshift(
      ...withValidValues.map(key => {
        const keyAccessor = getKeyAccessor(key);
        return `if (!validator.__validValues${keyAccessor}[value${keyAccessor}]) return false`;
      })
    );
  }
  bodyCodeLines.unshift("if (!value) return false");
  if (bodyCodeLines.some(line => line.indexOf("explanations") >= 0)) {
    bodyCodeLines.unshift("validator.explanations = []");
  }
  const code = beautify(
    `
    (() => {
      function validator(value) {
        ${bodyCodeLines.join("\n")}
        return true
      }
      return validator
    })()
  `.trim()
  );

  // tslint:disable-next-line
  const ctx = eval(code);

  for (const prepare of preparations) {
    prepare(ctx);
  }

  ctx.explanations = [];

  return ctx;
}
