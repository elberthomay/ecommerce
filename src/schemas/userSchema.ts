import { hasPropertyRefineArgument, uuidSchema } from "./commonSchema";
import { z } from "zod";

export const userSchema = z.object({
  id: uuidSchema,
  name: z.string().min(3).max(60),
  email: z
    .string()
    .email()
    .max(320)
    .pipe(
      z.string().superRefine((email, ctx) => {
        const [local, domain] = email.split("@");
        const domainParts = domain.split(".");
        const tld = domainParts[domainParts.length - 1];
        if (local.length > 64)
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: 64,
            type: "string",
            inclusive: true,
            message: "local identifier could not be longer than 64 characters",
          });
        if (domain.length > 255)
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: 255,
            type: "string",
            inclusive: true,
            message: "domain name could not be longer than 255 characters",
          });
        if (tld.length > 63)
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: 63,
            type: "string",
            inclusive: true,
            message: "domain tld could not be longer than 63 characters",
          });
      })
    ),
  privilege: z.number().min(0).max(2).int(),
  selectedAddressId: z.string().uuid().nullable(),
  avatar: z.string().nullable(),
  password: z.string().min(8).max(90),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = userSchema
  .pick({
    name: true,
    email: true,
    password: true,
  })
  .strict();

export const loginSchema = userSchema
  .pick({
    email: true,
    password: true,
    rememberMe: true,
  })
  .strict();

export const currentUserOutputSchema = userSchema
  .omit({
    password: true,
    rememberMe: true,
  })
  .extend({ cartCount: z.number().int().min(0) });

export const userUpdateSchema = userSchema
  .pick({ name: true })
  .partial()
  .strict()
  .refine(...hasPropertyRefineArgument);
