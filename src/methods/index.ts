import {
  IDictionary,
  InstanceSettings,
  Schema,
  TypeGuardValidator,
  ValidatorWithSchema
} from "../types";
import { getArrayValidator } from "./array";
import { getArrayOfValidator } from "./arrayOf";
import { getBooleanValidator } from "./boolean";
import { ValidatorType } from "./constants";
import { getDictionaryOfMethod } from "./dictionaryOf";
import { getEnumMethod } from "./enum";
import { getNumberValidator } from "./number";
import { getSafeIntegerValidator } from "./safeInteger";
import {
  getNegativeValidator,
  getNonNegativeValidator,
  getNonPositiveValidator,
  getPositiveValidator
} from "./signs";
import { getStringValidator } from "./string";

type FromSettings<T = any> = (settings: InstanceSettings) => T;
export type ArrayMethod = TypeGuardValidator<any[]> & {
  schema: { type: ValidatorType };
};
export type ArrayOfMethod = <T = any>(
  schema: Schema
) => TypeGuardValidator<T[]> & {
  schema: { type: ValidatorType; innerSchema: Schema };
};
export type EnumMethod = (
  ...values: any
) => ValidatorWithSchema<{ type: ValidatorType; innerSchema: any[] }>;

export type DictionaryOfMethod = <T = any>(
  schema: Schema
) => TypeGuardValidator<IDictionary<T>> & {
  schema: { type: ValidatorType; innerSchema: Schema };
};

export type NumberValidationMethod = TypeGuardValidator<number> & {
  schema: { type: ValidatorType };
};

export type StringMethod = TypeGuardValidator<string> & {
  schema: { type: ValidatorType };
};
export type BooleanMethod = TypeGuardValidator<boolean> & {
  schema: { type: ValidatorType };
};

export interface IMethods {
  array: ArrayMethod;
  arrayOf: ArrayOfMethod;
  boolean: BooleanMethod;
  dictionaryOf: DictionaryOfMethod;
  enum: EnumMethod;
  negative: NumberValidationMethod;
  nonNegative: NumberValidationMethod;
  nonPositive: NumberValidationMethod;
  number: NumberValidationMethod;
  positive: NumberValidationMethod;
  safeInteger: NumberValidationMethod;
  string: StringMethod;
}

export const getMethods: FromSettings<IMethods> = settings => {
  const methods: IMethods = {
    array: Object.assign(getArrayValidator(settings), {
      schema: { type: ValidatorType.Array }
    }),
    arrayOf: getArrayOfValidator(settings),
    boolean: Object.assign(getBooleanValidator(settings), {
      schema: { type: ValidatorType.Boolean }
    }),
    dictionaryOf: getDictionaryOfMethod(settings),
    enum: getEnumMethod(settings),
    negative: Object.assign(getNegativeValidator(settings), {
      schema: { type: ValidatorType.Negative }
    }),
    nonNegative: Object.assign(getNonNegativeValidator(settings), {
      schema: { type: ValidatorType.NonNegative }
    }),
    nonPositive: Object.assign(getNonPositiveValidator(settings), {
      schema: { type: ValidatorType.NonPositive }
    }),
    number: Object.assign(getNumberValidator(settings), {
      schema: { type: ValidatorType.Number }
    }),
    positive: Object.assign(getPositiveValidator(settings), {
      schema: { type: ValidatorType.Positive }
    }),
    safeInteger: Object.assign(getSafeIntegerValidator(settings), {
      schema: { type: ValidatorType.SafeInteger }
    }),
    string: Object.assign(getStringValidator(settings), {
      schema: { type: ValidatorType.String }
    })
  };
  return methods;
};
