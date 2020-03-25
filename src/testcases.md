# Test Cases

## Add Tabs

- addTabs('1')
- addTabs('1', 1)
- addTabs('1', 2)

## Compile And

- v.compileAnd()
- v.compileAnd(1)
- v.compileAnd(1, 1)
- v.compileAnd(1, 2)
- v.compileAnd(1, 1, 2)
- v.compileAnd(1, isNotOne)
- v.compileAnd(funcWithPrepare, funcWithoutPrepare)
- v.compileAnd(funcWithNot, funcWithoutNot)
- v.compileAnd(funcWithHandle, funcWithoutHandle)
- v.compileAnd({ a: funcWithoutHandle }, { b: funcWithHandle })
- v.compileAnd({ a: funcWithoutHandle, [v.rest]: funcWithoutHandle }, { b: funcWithHandle, [v.rest]: funcWithHandle })
- v.compileAnd(func, [])
- v.compileAnd(func, [func])
- v.compileAnd(func, [funcWithHandle, funcWithoutHandle])
- v.compileAnd(func, [funcWithoutHandle, funcWithoutHandle])

## Compile Array

- v.compileArrayOf(null)
- v.compileArrayOf(undefined)
- v.compileArrayOf(42)
- v.compileArrayOf(NaN)
- v.compileArrayOf("true")
- v.compileArrayOf("false")
- v.compileArrayOf(true)
- v.compileArrayOf(false)
- v.compileArrayOf(Symbol.for('test'))
- v.compileArrayOf(funcWithPrepare)
- v.compileArrayOf(funcWithoutPrepare)
- v.compileArrayOf(funcWithNot)
- v.compileArrayOf(funcWithoutNot)
- v.compileArrayOf(funcWithHandle)
- v.compileArrayOf(funcWithoutHandle)
- v.compileArrayOf({ a: 42 })
- v.compileArrayOf({ a: funcWithHandle })
- v.compileArrayOf({ a: 41, [v.rest]: funcWithHandle })
- v.compileArrayOf({ a: 41, [v.rest]: funcWithoutHandle })
- v.compileArrayOf([])
- v.compileArrayOf([42])
- v.compileArrayOf([funcSchema, 42])
- v.compileArrayOf([funcSchemaWithHandle, 42])

## Compile Constant

- v(42)
- v(NaN)

## Func

- v(funcs)
- v(funcsWithHandle)
  ...

## Not

- v.not(undefined)
- v.not(null)
- v.not(NaN)
- v.not(42)
- v.not(true)
- v.not(false)
- v.not(Symbol.for('test'))
- v.not("test")
- v.not(funcWithNot)
- v.not(funcWithoutNot)
- v.not({ a: 42 })

## Object

- v({})
- v({ a: null })
- v({ a: undefined })
- v({ a: NaN })
- v({ a: 42 })
- v({ a: 'true' })
- v({ a: 'false' })
- v({ a: 'test' })
- v({ a: Symbol.for('test') })
- v({ a: true })
- v({ a: false })
- v({ a: funcWithPrepare })
- v({ a: funcWithoutPrepare })
- v({ a: funcWithHandle })
- v({ a: funcWithoutHandle })
- v({ a: { b: pureFunc } })
- v({ a: { b: impureFunc } })
- v({ a: { b: pureFunc }, c: pureFunc })
- v({ a: { b: impureFunc }, c: pureFunc })
- v({ a: { b: pureFunc }, c: impureFunc })
- v({ a: { b: impureFunc }, c: impureFunc })
- v({ a: { b: 42 }})
- v({ a: { b: 42, c: pureFunc }})
- v({ a: { b: 42, c: impureFunc }})
- v({ a: { b: 42, [v.rest]: pureFunc }})
- v({ a: { b: 42, [v.rest]: impureFunc }})
- v({ a: [] })
- v({ a: [42] })
- v({ a: [pureFunc, pureFunc] })
- v({ a: [impureFunc, pureFunc] })
- v({ a: 41, b: 42 })

## With Rest

- v({ [v.rest]: pureFunc })
- v({ [v.rest]: impureFunc })
- v({ a: 42, [v.rest]: pureFunc })
- v({ a: 42 [v.rest]: impureFunc })
- v({ a: impureFunc, [v.rest]: pureFunc })
- v({ a: impureFunc, [v.rest]: impureFunc })

## Variants

- v([])
- v([pureFunc])
- v([pureFunc, impureFunc])
- v([pureFunc, pureFunc])
- v([1,2,3,4,5])
- v(["A", "B"])

## getKeyAccessor

- getKeyAccessor('')
- getKeyAccessor('a')
- getKeyAccessor('1a')
- getKeyAccessor('a1')
- getKeyAccessor('a-1')

## handleSchema

- handleSchema(pureFunc)
- handleSchema(null)
- handleSchema(all primitives)
- handleSchema([])
- handleSchema({ a: 1 })
- handleSchema({ a: 1, [v.rest]: 2 })

## has

- has(null, 'Andrew')
- has({}, 'toString')
- has({}, 'toString2')
- has({ toString: 'toString' }, 'toString')
- has({ a: 1 }, 'a')

## index

- v.method is a function
- v.rest is a string

## v.bigint

- v.bigint(1)
- v.bigint(1n)

## boolean

- v.boolean(true)
- v.boolean(false)
- v.boolean('false')
- v.boolean('true')
- v.boolean(1)
- v.boolean(0)

## v.custom

- v.custom(func)
- v.custom(func, simple explanation)
- v.custom(func, func explanation)
- v.custom(v(impure func))
- v.custom(v(pure func))

## v.function

- v.function(function(x) { return x})
- v.function(x => x)

## v.negative

- v.negative(-0)
- v.negative(-1)
- v.negative(1)

## v.number

- v.number(0)
- v.number(3.14)
- v.number(NaN)
- v.number(Infinity)
- v.number(-Infinity)

## v.positive

- v.positive(-1)
- v.positive(-0)
- v.positive(1)

## safeInteger

## string

## symbol

## test
