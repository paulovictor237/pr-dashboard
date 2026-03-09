import { redirect, Form, useActionData, useNavigation } from "react-router"
import type { Route } from "./+types/login"
import { getTokenFromCookieHeader, createTokenCookie } from "~/lib/session.server"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldError } from "~/components/ui/field"

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") ?? ""
  const token = getTokenFromCookieHeader(cookieHeader)
  if (token) {
    throw redirect("/")
  }
  return null
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const token = (formData.get("token") as string)?.trim()

  if (!token) {
    return { error: "Informe um token." }
  }

  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  })

  if (!response.ok) {
    return { error: "Token inválido ou sem permissão. Verifique os escopos." }
  }

  throw redirect("/", {
    headers: { "Set-Cookie": createTokenCookie(token) },
  })
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col gap-6 px-4">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">PR Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Cole seu GitHub Personal Access Token para continuar.
          </p>
        </div>

        <Form method="post" className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!actionData?.error || undefined}>
              <FieldLabel htmlFor="token">Personal Access Token</FieldLabel>
              <Input
                id="token"
                name="token"
                type="password"
                placeholder="ghp_..."
                autoComplete="off"
                required
                aria-invalid={!!actionData?.error || undefined}
              />
              {actionData?.error && <FieldError>{actionData.error}</FieldError>}
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Validando..." : "Entrar"}
          </Button>
        </Form>

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
