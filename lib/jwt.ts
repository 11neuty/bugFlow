import { jwtVerify, SignJWT } from "jose";

import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "@/lib/constants";
import { getEnv } from "@/lib/env";
import type { AuthUser } from "@/lib/types";

type TokenKind = "access" | "refresh";

export interface TokenPayload extends AuthUser {
  type: TokenKind;
}

const encoder = new TextEncoder();

function getSecret(type: TokenKind) {
  const env = getEnv();

  return encoder.encode(
    type === "access" ? env.JWT_SECRET : env.REFRESH_SECRET,
  );
}

async function signToken(user: AuthUser, type: TokenKind, expiresIn: number) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    type,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(getSecret(type));
}

export function signAccessToken(user: AuthUser) {
  return signToken(user, "access", ACCESS_TOKEN_TTL_SECONDS);
}

export function signRefreshToken(user: AuthUser) {
  return signToken(user, "refresh", REFRESH_TOKEN_TTL_SECONDS);
}

async function verifyToken(token: string, type: TokenKind) {
  const { payload } = await jwtVerify(token, getSecret(type));

  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: payload.name as string,
    role: payload.role as AuthUser["role"],
    type: payload.type as TokenKind,
  };
}

export async function verifyAccessToken(token: string) {
  const payload = await verifyToken(token, "access");

  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return payload;
}

export async function verifyRefreshToken(token: string) {
  const payload = await verifyToken(token, "refresh");

  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  return payload;
}
