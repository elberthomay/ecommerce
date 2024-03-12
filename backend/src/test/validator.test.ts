import validator from "../middlewares/validator"; // Import your validator function
import ValidationError from "../errors/ValidationError"; // Import the ValidationError class from Joi
import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

// Define the reusable test function

export const validatorTestFunction = (
  schemas: { [key in "body" | "params" | "query"]?: ZodTypeAny },
  inputData: { [key in "body" | "params" | "query"]?: any },
  expectedResult:
    | { value: { [key in "body" | "params" | "query"]?: any } }
    | { errors: { [key in "body" | "params" | "query"]?: ValidationError[] } },
  testName: string
) => {
  const mockRequest = inputData;
  const mockResponse = {};
  const mockNext = jest.fn();

  it(`should validate and handle input validation on ${testName} as expected`, () => {
    const keys: ("body" | "params" | "query")[] = Object.keys(schemas) as (
      | "body"
      | "params"
      | "query"
    )[];

    // Mock the behavior of safeParse
    const validateMocks: {
      [key in "body" | "params" | "query"]?: jest.SpyInstance;
    } = {};
    keys.forEach(
      (key) => (validateMocks[key] = jest.spyOn(schemas[key]!, "safeParse"))
    );

    // Call the validator middleware
    validator(schemas)(
      mockRequest as Request,
      mockResponse as Response,
      mockNext as NextFunction
    );

    //check if validate has been called for each schema
    keys.forEach((key) => {
      expect(validateMocks[key]).toHaveBeenCalledWith(
        inputData[key],
        expect.objectContaining({ abortEarly: false })
      );
    });

    // Expectations based on the expectedResult
    if ("value" in expectedResult) {
      keys.forEach((key) => {
        expect(mockRequest[key]).toEqual(expectedResult.value[key]);
      });
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    } else {
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext.mock.calls[0][0].errors).toEqual(expectedResult.errors);
    }
  });
};
