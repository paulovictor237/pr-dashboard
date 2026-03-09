import { describe, it, expect } from "vitest"
import { parseRepos, addRepo, removeRepo } from "~/hooks/use-repos"

describe("repo management (pure functions)", () => {
  it("parseRepos retorna array vazio para string vazia", () => {
    expect(parseRepos("")).toEqual([])
  })

  it("parseRepos parseia JSON válido", () => {
    expect(parseRepos(JSON.stringify(["org/repo1", "org/repo2"]))).toEqual([
      "org/repo1",
      "org/repo2",
    ])
  })

  it("parseRepos retorna array vazio para JSON inválido", () => {
    expect(parseRepos("not-json")).toEqual([])
  })

  it("addRepo adiciona repositório sem duplicatas", () => {
    const repos = ["org/repo1"]
    expect(addRepo(repos, "org/repo2")).toEqual(["org/repo1", "org/repo2"])
    expect(addRepo(repos, "org/repo1")).toEqual(["org/repo1"]) // sem duplicata
  })

  it("removeRepo remove repositório existente", () => {
    const repos = ["org/repo1", "org/repo2"]
    expect(removeRepo(repos, "org/repo1")).toEqual(["org/repo2"])
  })
})
