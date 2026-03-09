import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchPRsForRepo, fetchCurrentUser } from "~/lib/github"

describe("github client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  it("fetchCurrentUser retorna o usuário autenticado", async () => {
    const mockUser = { id: 1, login: "testuser", name: "Test User", avatar_url: "" }
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser),
    } as Response)

    const user = await fetchCurrentUser("gh_token")
    expect(user.login).toBe("testuser")
    expect(fetch).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer gh_token" }) })
    )
  })

  it("lança erro quando resposta não é ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response)

    await expect(fetchCurrentUser("bad_token")).rejects.toThrow("GitHub API error: 401")
  })
})
