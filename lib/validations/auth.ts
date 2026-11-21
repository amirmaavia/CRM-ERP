import { RoleName, UserStatus } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(8) });
export const forgotPasswordSchema = z.object({ email: z.string().trim().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password: z.string().min(8).max(128) });

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(RoleName),
  workspace: z.enum(["INDEPENDENT", "SHARED"]).default("INDEPENDENT"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.nativeEnum(RoleName).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  image: z.string().url().optional().nullable(),
});