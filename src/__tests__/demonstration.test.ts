import { v } from "../index";

test("big object", () => {
  const { dictionaryOf, arrayOf, positive, negative, array } = v;
  // tslint:disable-next-line:interface-name
  interface Obj {
    a: number;
    arr: number[];
    array: any[];
    dict: { [key: string]: number };
    int: number;
    neg: number;
    pos: number;
  }
  const checkObj = v<Obj>({
    a: v.number,
    arr: arrayOf(v.number),
    array,
    dict: dictionaryOf(v.number),
    int: v.safeInteger,
    neg: negative,
    pos: positive
  });
  const validObjs = [
    {
      a: 1,
      arr: [1, 2, 3, 4, 5],
      array: ["1", 2],
      dict: { a: 1, b: 2 },
      int: 1,
      neg: -1,
      pos: 2
    },
    {
      a: NaN,
      arr: [],
      array: [],
      dict: {},
      int: 0,
      neg: -2,
      pos: 1
    }
  ];

  const invalidObjs = [
    {
      a: "1",
      arr: [1, 2, 3, 4, 5],
      array: ["1", 2],
      dict: { a: 1, b: 2 },
      int: 1,
      neg: -1,
      pos: 2
    },
    {
      a: NaN,
      arr: ["1"],
      array: [],
      dict: {},
      int: 0,
      neg: -2,
      pos: 1
    },
    {
      a: 1,
      arr: [1, 2, 3, 4, 5],
      array: ["1", 2],
      dict: null,
      int: 1,
      neg: -1,
      pos: 2
    },
    {
      a: NaN,
      arr: [],
      array: [],
      dict: {},
      int: 0.5,
      neg: -2,
      pos: 1
    },
    {
      a: 1,
      arr: [1, 2, 3, 4, 5],
      array: ["1", 2],
      dict: { a: 1, b: 2 },
      int: 1,
      neg: 0,
      pos: 1
    },
    {
      a: NaN,
      arr: [],
      array: [],
      dict: {},
      int: 0,
      neg: -2,
      pos: 0
    }
  ];
  for (const validObj of validObjs) {
    expect(checkObj(validObj)).toBe(true);
  }
  expect(v.arrayOf<Obj>(checkObj)(validObjs)).toBe(true);
  for (const invalidObj of invalidObjs) {
    expect(checkObj(invalidObj)).toBe(false);
  }
});
