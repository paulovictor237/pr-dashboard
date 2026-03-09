import { deleteCookie } from "@tanstack/react-start/server"

export function clearAuth(): void {
  deleteCookie("gh_token", { path: "/" })
}
