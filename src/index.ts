import {
  HandleSchemaHandlers,
  Schema,
  FunctionSchemaResult,
  ConstantSchema,
  Context,
  Prepare,
  HandleError,
  IVariantSchema,
  IObjectSchema,
  IMethods,
  QuartetInstance,
  CompilationResult
} from "./types";

const beautify = (code: string) => {
  const lines = code.split("\n");
  const resLines = [];
  let tabs = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed[trimmed.length - 1] === "}") {
      tabs = tabs.slice(2);
    }
    const tabbed = tabs + trimmed;

    resLines.push(tabbed);
    if (trimmed[trimmed.length - 1] === "{") {
      tabs += "  ";
    }
  }
  return resLines.join("\n");
};

const EMPTY: any = {};
function has(obj: any, key: any) {
  if (!obj) return false;
  if (EMPTY[key] !== undefined) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }
  return obj[key] !== undefined || key in obj;
}
function handleSchema<R>(
  handlers: HandleSchemaHandlers<R>
): (schema: Schema) => R {
  return schema => {
    if (typeof schema === "function") {
      return handlers.function(schema);
    }
    if (!schema || typeof schema !== "object") {
      return handlers.constant(schema);
    }
    if (Array.isArray(schema)) {
      return handlers.variant(schema);
    }
    if (has(schema, methods.rest)) {
      return handlers.objectRest(schema);
    } else {
      return handlers.object(schema);
    }
  };
}
function compileFunctionSchemaResult(s: FunctionSchemaResult) {
  let code = `() => true`;

  if (s.handleError) {
    code = beautify(`(() => {
      function validator(value) {
        validator.explanations = []
        if (${s.check("value", "validator")}) {
          return true
        }
        ${s.handleError("value", "validator")}
        return false
      }
      return validator
    })()`);
  } else {
    code = beautify(`(() => {
        function validator(value) {
          validator.explanations = []
          return ${s.check("value", "validator")}
        }
        return validator
      })()`);
  }
  const ctx = eval(code);
  ctx.explanations = [];
  if (s.prepare) {
    s.prepare(ctx);
  }
  return ctx;
}

function compileConstant(c: ConstantSchema) {
  return Object.assign((value: any) => value === c, { explanations: [] });
}

let toContextCounter: Record<string, number> = {};
let toContext = (prefix: string, value: any) => {
  if (!toContextCounter[prefix]) {
    toContextCounter[prefix] = 0;
  }
  const id = `${prefix}-${toContextCounter[prefix]++}`;
  toContextCounter[prefix] %= 1e9;
  return [
    id,
    (ctx: Context) => {
      ctx[id] = value;
    }
  ] as [string, (ctx: Context) => void];
};

function compileVariantElementToReturnWay(
  c: QuartetInstance,
  index: number,
  valueId: string,
  ctxId: string,
  schema: Schema,
  preparations: Prepare[],
  handleErrors: HandleError[],
  stringNumbersSymbols: (string | number | symbol)[]
): string {
  return handleSchema({
    function: schema => {
      const s = schema();

      if (s.prepare) {
        preparations.push(s.prepare);
      }
      if (s.handleError) {
        handleErrors.push(s.handleError);
      }
      return `if (${s.check(valueId, ctxId)}) return true;`;
    },
    constant: schema => {
      if (schema === null) {
        return `if (${valueId} === null) return true`;
      }
      if (schema === undefined) {
        return `if (${valueId} === undefined) return true`;
      }
      if (
        typeof schema === "symbol" ||
        typeof schema === "string" ||
        typeof schema === "number"
      ) {
        stringNumbersSymbols.push(schema);
        return "";
      }
      return `if (${valueId} === ${JSON.stringify(schema)}) return true`;
    },
    variant: schema => {
      const res = [];
      for (let variant of schema) {
        res.push(
          compileVariantElementToReturnWay(
            c,
            index,
            valueId,
            ctxId,
            variant,
            preparations,
            handleErrors,
            stringNumbersSymbols
          )
        );
      }
      return res.join("\n");
    },
    object: schema => {
      const compiled = compileObjectSchema(c, schema);
      const [id, prepare] = toContext("variant-" + index, compiled);
      preparations.push(prepare);
      return compileVariantElementToReturnWay(
        c,
        index,
        valueId,
        ctxId,
        () => ({
          check: (valueId, ctxId) => `${ctxId}['${id}'](${valueId})`,
          not: (valueId, ctxId) => `!${ctxId}['${id}'](${valueId})`,
          handleError: () =>
            `${ctxId}.explanations.push(...${ctxId}['${id}'].explanations)`
        }),
        preparations,
        handleErrors,
        stringNumbersSymbols
      );
    },
    objectRest: schema => {
      const compiled = compileObjectSchemaWithRest(c, schema);
      const [id, prepare] = toContext("variant-" + index, compiled);
      preparations.push(prepare);
      return compileVariantElementToReturnWay(
        c,
        index,
        valueId,
        ctxId,
        () => ({
          check: (valueId, ctxId) => `${ctxId}['${id}'](${valueId})`,
          not: (valueId, ctxId) => `!${ctxId}['${id}'](${valueId})`,
          handleError: () =>
            `${ctxId}.explanations.push(...${ctxId}['${id}'].explanations)`
        }),
        preparations,
        handleErrors,
        stringNumbersSymbols
      );
    }
  })(schema);
}

function compileVariants(c: QuartetInstance, variants: IVariantSchema) {
  if (variants.length === 0) {
    return Object.assign(() => false, { explanations: [] });
  }
  if (variants.length === 1) {
    return c(variants[0]);
  }
  const preparations: Prepare[] = [];
  const handleErrors: HandleError[] = [];
  const stringNumbersSymbols: (string | number | symbol)[] = [];
  const bodyCode = [];
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    bodyCode.push(
      compileVariantElementToReturnWay(
        c,
        i,
        `value`,
        `validator`,
        variant,
        preparations,
        handleErrors,
        stringNumbersSymbols
      )
    );
  }
  let __validValuesDict = {};
  if (stringNumbersSymbols.length > 0) {
    __validValuesDict = stringNumbersSymbols.reduce((dict: any, el) => {
      dict[el] = true;
      return dict;
    }, {});
    bodyCode.unshift(
      `if (validator.__validValuesDict[value] === true) return true`
    );
  }
  if (handleErrors.length > 0) {
    bodyCode.push(
      ...handleErrors.map(handleError => handleError("value", "validator"))
    );
  }
  const ctx = eval(
    beautify(`(() => {
    function validator(value) {

      ${bodyCode
        .map(e => e.trim())
        .filter(Boolean)
        .join("\n")}
      return false
    }
    return validator
  })()`)
  );
  for (const prepare of preparations) {
    prepare(ctx);
  }
  ctx.explanations = [];
  if (stringNumbersSymbols.length > 0) {
    ctx.__validValuesDict = __validValuesDict;
  }
  return ctx;
}

export const methods: IMethods = {
  string: () => ({
    check: valueId => `typeof ${valueId} === 'string'`,
    not: valueId => `typeof ${valueId} !== 'string'`
  }),
  number: () => ({
    check: valueId => `typeof ${valueId} === 'number'`,
    not: valueId => `typeof ${valueId} !== 'number'`
  }),
  safeInteger: () => ({
    check: valueId => `Number.isSafeInteger(${valueId})`,
    not: valueId => `!Number.isSafeInteger(${valueId})`
  }),
  rest: "__quartet/rest__"
};

function compilePropValidationWithoutRest(
  c: QuartetInstance,
  key: string,
  valueId: string,
  ctxId: string,
  schema: Schema,
  preparations: Prepare[],
  stringNumbersSymbols: (string | number | symbol)[]
): string {
  return handleSchema({
    function: schema => {
      const s = schema();
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
    constant: schema => {
      if (schema === null) {
        return `if (${valueId} !== null) return false`;
      }
      if (schema === undefined) {
        return `if (${valueId} !== undefined) return false`;
      }
      if (
        typeof schema === "symbol" ||
        typeof schema === "string" ||
        typeof schema === "number"
      ) {
        stringNumbersSymbols.push(schema);
        return "";
      }
      return `if (${valueId} !== ${JSON.stringify(schema)}) return false`;
    },
    objectRest: schema => {
      const compiled = c(schema);
      const [id, prepare] = toContext(key, compiled);
      preparations.push(prepare);
      return compilePropValidationWithoutRest(
        c,
        key,
        valueId,
        ctxId,
        () => ({
          check: (valueId, ctxId) => `${ctxId}['${id}'](${valueId})`,
          not: (valueId, ctxId) => `!${ctxId}['${id}'](${valueId})`
        }),
        preparations,
        stringNumbersSymbols
      );
    },
    object: schema => {
      const compiled = c(schema);
      const [id, prepare] = toContext(key, compiled);
      preparations.push(prepare);
      return compilePropValidationWithoutRest(
        c,
        key,
        valueId,
        ctxId,
        () => ({
          check: (valueId, ctxId) => `${ctxId}['${id}'](${valueId})`,
          not: (valueId, ctxId) => `!${ctxId}['${id}'](${valueId})`
        }),
        preparations,
        stringNumbersSymbols
      );
    },
    variant: schema => {
      if (schema.length === 0) {
        return `return false`;
      }
      if (schema.length === 1) {
        return compilePropValidationWithoutRest(
          c,
          key,
          valueId,
          ctxId,
          schema[0],
          preparations,
          stringNumbersSymbols
        );
      }
      const compiled = c(schema);
      const [id, prepare] = toContext(key, compiled);
      preparations.push(prepare);
      return compilePropValidationWithoutRest(
        c,
        key,
        valueId,
        ctxId,
        () => ({
          check: (valueId, ctxId) => `${ctxId}['${id}'](${valueId})`,
          not: (valueId, ctxId) => `!${ctxId}['${id}'](${valueId})`
        }),
        preparations,
        stringNumbersSymbols
      );
    }
  })(schema);
}
function getKeyAccessor(key: string) {
  return /^[a-zA-Z0-9_]+$/.test(key) ? "." + key : `[${JSON.stringify(key)}]`;
}
function compileObjectSchema(c: QuartetInstance, s: IObjectSchema) {
  const keys = Object.keys(s);
  if (keys.length === 0) {
    return Object.assign((value: any) => value, { explanations: [] });
  }
  const bodyCodeLines = [];
  const preparations: Prepare[] = [];
  const ctxId = "validator";
  const validValues: Record<string, Record<string, true>> = {};
  const withValidValues: string[] = [];
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

  if (withValidValues) {
    preparations.push(ctx => {
      ctx.__validValues = validValues;
    });
    bodyCodeLines.unshift(
      ...withValidValues.map(key => {
        const keyAccessor = getKeyAccessor(key);
        return `if (!validator.__validValues${keyAccessor}[value${keyAccessor}]) return false`;
      })
    );
  }
  bodyCodeLines.unshift(
    "if (!value) return false",
    "validator.explanations = []"
  );
  const ctx = eval(
    beautify(
      `
    (() => {
      function validator(value) {
        ${bodyCodeLines.join("\n")}
        return true
      }
      return validator
    })()
  `.trim()
    )
  );

  for (const prepare of preparations) {
    prepare(ctx);
  }

  ctx.explanations = [];

  return ctx;
}
function compileObjectSchemaWithRest(c: QuartetInstance, s: IObjectSchema) {
  const { [methods.rest]: restSchema, ...propsSchemas } = s;
  const [restId, prepareRestId] = toContext("rest-validator", c(restSchema));
  const propsWithSchemas = Object.keys(propsSchemas);
  const [definedProps, prepareDefinedProps] = toContext(
    "defined",
    c(propsSchemas)
  );
  const __propsWithSchemasDict = propsWithSchemas.reduce((dict: any, prop) => {
    dict[prop] = true;
    return dict;
  }, {});

  const ctx = eval(
    beautify(`
    (()=>{
      function validator(value) {
        validator.explanations = []
        ${
          propsWithSchemas.length > 0
            ? `if (!validator['${definedProps}'](value)) {
          validator.explanations.push(...validator['${definedProps}'].explanations)
          return false
        }`
            : `if (!value) return false`
        }
        const keys = Object.keys(value)
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i]
          ${
            propsWithSchemas.length > 0
              ? `if (validator.__propsWithSchemasDict[key] === true) continue`
              : ``
          }
          if (!validator['${restId}'](value[key])) {
            validator.explanations.push(...validator['${restId}'].explanations)
            return false
          }
        }
        return true
      }
      return validator
    })()
  `)
  );
  prepareRestId(ctx);
  prepareDefinedProps(ctx);
  ctx.explanations = [];
  ctx.__propsWithSchemasDict = __propsWithSchemasDict;
  return ctx;
}

export function quartet(): QuartetInstance {
  const v = function v(s: Schema): CompilationResult {
    const compiled = handleSchema<CompilationResult>({
      function: s => compileFunctionSchemaResult(s()),
      constant: s => compileConstant(s),
      variant: s => compileVariants(v as any, s),
      objectRest: s => compileObjectSchemaWithRest(v as any, s),
      object: s => compileObjectSchema(v as any, s)
    })(s);

    return compiled as any;
  };
  return Object.assign(v, methods) as QuartetInstance;
}

export const v = quartet();
