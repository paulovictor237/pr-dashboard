import { describe, it, expect } from "vitest"
import { createTokenCookie, getTokenFromCookieHeader, clearTokenCookie } from "~/lib/session.server"

describe("session.server", () => {
  it("creates a cookie string with the token", () => {
    const cookie = createTokenCookie("gh_abc123")
    expect(cookie).toContain("gh_token=gh_abc123")
    expect(cookie).toContain("Max-Age=2592000")
    expect(cookie).toContain("SameSite=Lax")
  })

  it("parses token from cookie header", () => {
    const token = getTokenFromCookieHeader("gh_token=gh_abc123; other=val")
    expect(token).toBe("gh_abc123")
  })

  it("returns null when cookie is absent", () => {
    const token = getTokenFromCookieHeader("other=val")
    expect(token).toBeNull()
  })

  it("clear cookie sets Max-Age=0", () => {
    const cookie = clearTokenCookie()
    expect(cookie).toContain("gh_token=")
    expect(cookie).toContain("Max-Age=0")
  })
})
