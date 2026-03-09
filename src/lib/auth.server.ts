import { redirect } from "react-router"
import { getTokenFromCookieHeader, clearTokenCookie } from "~/lib/session.server"

export async function requireAuth(request: Request): Promise<string> {
  const cookieHeader = request.headers.get("Cookie") ?? ""
  const token = getTokenFromCookieHeader(cookieHeader)
  if (!token) {
    throw redirect("/login")
  }
  return token
}

export function logoutHeaders(): HeadersInit {
  return {
    "Set-Cookie": clearTokenCookie(),
    Location: "/login",
  }
}
