import { redirect } from "@tanstack/react-router"
import { getCookie, deleteCookie } from "@tanstack/react-start/server"

export async function requireAuth(): Promise<string> {
  const token = getCookie("gh_token")
  if (!token) {
    throw redirect({ to: "/login" })
  }
  return token
}

export function clearAuth(): void {
  deleteCookie("gh_token", { path: "/" })
}
