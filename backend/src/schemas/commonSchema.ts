import orderNameEnum from "../var/orderNameEnum";
import { z } from "zod";

function getZodEnumFromObjectKeys<
  TI extends Record<string, any>,
  R extends string = TI extends Record<infer R, any> ? R : never
>(input: TI): z.ZodEnum<[R, ...R[]]> {
  const [firstKey, ...otherKeys] = Object.keys(input) as [R, ...R[]];
  return z.enum([firstKey, ...otherKeys]);
}

export const minPropertyRefineArgument = (
  count: number
): [(data: Record<any, any>) => boolean, string] => [
  (data: Record<any, any>) =>
    Object.values(data).filter((data) => data !== undefined).length >= count,
  `Must have at least ${count} propert${count > 1 ? "ies" : "y"}`,
];

export const hasPropertyRefineArgument = minPropertyRefineArgument(1);

export const uuidSchema = z.string().uuid().length(36);

export const numericIdSchema = z.coerce.number().int().min(1);

export const nonemptyString = z
  .string({ required_error: "This field cannot be empty" })
  .trim()
  .min(1, "Thir field cannot be empty");

export const searchSchema = z.object({
  search: nonemptyString
    .regex(
      /[a-zA-Z0-9_\-., ]+/,
      "Search string could only contain letter, number, underscore, dash, dot, comma or space"
    )
    .max(60),

  limit: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number().min(1).max(500)),
  page: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number().min(1).max(1000)),
  orderBy: getZodEnumFromObjectKeys(orderNameEnum),
});

export const longitudeSchema = z
  .number()
  .min(-180)
  .max(180)
  .transform((value) => Math.round(value * 10000) / 10000);

export const latitudeSchema = z
  .number()
  .min(-90)
  .max(90)
  .transform((value) => Math.round(value * 10000) / 10000);

export const coordinateSchema = z.object({
  longitude: longitudeSchema.optional(),
  latitude: latitudeSchema.optional(),
});

export const coordinateCompletenessRefineArgument: [
  (data: z.infer<typeof coordinateSchema>) => boolean,
  string
] = [
  (data) => !!data.latitude === !!data.longitude,
  "Either latitude or longitude is missing",
];
