import { parse, serialize } from "cookie"

const COOKIE_NAME = "gh_token"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export function createTokenCookie(token: string): string {
  return serialize(COOKIE_NAME, token, {
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export function getTokenFromCookieHeader(cookieHeader: string): string | null {
  const cookies = parse(cookieHeader)
  return cookies[COOKIE_NAME] ?? null
}

export function clearTokenCookie(): string {
  return serialize(COOKIE_NAME, "", {
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}
