import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { setCookie } from "@tanstack/react-start/server"
import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"

const loginFn = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async (ctx) => {
    const { data } = ctx
    if (!data.token) return { error: "Informe um token." }

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${data.token}`,
        Accept: "application/vnd.github+json",
      },
    })

    if (!response.ok) {
      return { error: "Token inválido ou sem permissão. Verifique os escopos." }
    }

    setCookie("gh_token", data.token, {
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    return { success: true }
  })

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.token) throw redirect({ to: "/home" })
  },
  component: LoginPage,
})

function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const navigate = useNavigate()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const token = (new FormData(e.currentTarget).get("token") as string).trim()
    setError(null)
    startTransition(async () => {
      const result = await loginFn({ data: { token } })
      if (result?.error) {
        setError(result.error)
      } else {
        await router.invalidate()
        await navigate({ to: "/home" })
      }
    })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col gap-6 px-4">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">PR Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Cole seu GitHub Personal Access Token para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!error || undefined}>
              <FieldLabel htmlFor="token">Personal Access Token</FieldLabel>
              <Input
                id="token"
                name="token"
                type="password"
                placeholder="ghp_..."
                autoComplete="off"
                required
                aria-invalid={!!error || undefined}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Validando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-xs">
          Precisa de um token?{" "}
          <a
            href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=PR+Dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            Gerar no GitHub
          </a>{" "}
          (escopos: <code className="font-mono">repo</code>,{" "}
          <code className="font-mono">read:user</code>)
        </p>
      </div>
    </div>
  )
}
