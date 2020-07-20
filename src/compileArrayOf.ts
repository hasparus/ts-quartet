import { addTabs } from './addTabs'
import { compileIfNotValidReturnFalse } from './compileIfNotValidReturnFalse'
import { getKeyAccessor } from './getKeyAccessor'
import { handleSchema } from './handleSchema'
import { Prepare, QuartetInstance, Schema, TypedCompilationResult } from './types'

function getOptimizedOrNull<T = any>(schema: Schema) {
  return handleSchema<null | TypedCompilationResult<T[]>>({
    and: andSchema =>
      andSchema.length === 1
        ? Object.assign((value: any): value is T[] => value && Array.isArray(value), {
            explanations: [],
            pure: true,
          })
        : null,
    constant: () => null,
    function: () => null,
    object: () => null,
    objectRest: () => null,
    pair: () => null,
    variant: schemas => {
      if (schemas.length > 0) {
        return null
      }

      return Object.assign(
        (value: any): value is T[] => value && Array.isArray(value) && value.length === 0,
        { explanations: [], pure: true },
      )
    },
  })(schema)
}

export function compileArrayOf<T = any>(
  v: QuartetInstance,
  schema: Schema,
): TypedCompilationResult<T[]> {
  // compileArrayOf([])
  const optimizedOrNull = getOptimizedOrNull<T>(schema)

  if (optimizedOrNull) {
    return optimizedOrNull
  }

  const [elemId, prepareElem] = v.toContext('elem', undefined)
  const preparations: Prepare[] = [prepareElem]
  const getElem = getKeyAccessor(elemId)
  const [index, prepareI] = v.toContext('i', 0)
  const iAcc = getKeyAccessor(index)
  const [forLoopBody, pure] = compileIfNotValidReturnFalse(
    v,
    `validator${getElem}`,
    'validator',
    schema,
    preparations,
    iAcc,
  )

  preparations.push(prepareI)

  const code = `
    (() => {function validator(value) {${
      pure ? '' : '\n  validator.explanations = []'
    }\n  if (!value || !Array.isArray(value)) return false\n  for (validator${iAcc} = 0; validator${iAcc} < value.length; validator${iAcc}++) {\n    validator${getElem} = value[validator${iAcc}]\n${addTabs(
    forLoopBody,
    2,
  )}\n  }\n  return true\n}
        return validator
    })()
  `.trim()

  // tslint:disable-next-line
  const ctx = eval(code)

  for (const prepare of preparations) {
    prepare(ctx)
  }

  ctx.explanations = []
  ctx.pure = pure

  return ctx
}
