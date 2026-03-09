import { redirect } from "@tanstack/react-router"
import { deleteCookie, getCookie } from "@tanstack/react-start/server"

export function requireAuth(): string {
  const token = getCookie("gh_token")
  if (!token) {
    throw redirect({ to: "/login" })
  }
  return token
}

export function clearAuth(): void {
  deleteCookie("gh_token", { path: "/" })
}
