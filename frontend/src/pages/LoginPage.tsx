import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WordmarkBlock } from "@/components/brand/Logo";
import { useLogin, useSignup } from "@/services/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const signup = useSignup();
  const navigate = useNavigate();

  const isSubmitting = login.isPending || signup.isPending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (mode === "login") await login.mutateAsync({ email, password });
      else await signup.mutateAsync({ email, password });
      navigate("/");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      toast.error(axiosErr?.response?.data?.detail ?? "Something went wrong");
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg">
      {/* Left panel — brand/editorial */}
      <div className="md:w-[60%] bg-surface border-b md:border-b-0 md:border-r border-rule flex items-center justify-center px-10 py-16">
        <div className="max-w-md w-full">
          <WordmarkBlock subtitle="An atlas for your documents." />
          <p className="mt-8 text-base text-ink-muted leading-relaxed max-w-sm">
            Upload a PDF and ask questions. Atlas reads it carefully and cites
            every claim.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="md:w-[40%] flex items-center justify-center px-8 py-16">
        <div className="max-w-sm w-full">
          {/* Section heading in small-caps Fraunces */}
          <div className="mb-8">
            <p
              className="font-display text-sm text-ink-muted uppercase"
              style={{ letterSpacing: "0.15em", fontFeatureSettings: "'opsz' 144" }}
            >
              {mode === "login" ? "Sign in" : "Create account"}
            </p>
            <div className="mt-2 h-px w-8 bg-rule-strong" />
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-ink-muted mb-1">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-[0.12em] text-ink-muted mb-1">
                Password
              </label>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2 gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Working…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              {!isSubmitting && <ArrowRight className="size-4" />}
            </Button>
          </form>

          {/* Mode toggle — editorial text link */}
          <p className="mt-6 text-sm text-ink-muted">
            {mode === "login" ? (
              <>
                — New to Atlas?{" "}
                <button
                  className="text-ink hover:text-accent underline-offset-2 hover:underline transition-colors"
                  onClick={() => setMode("signup")}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                — Already have an account?{" "}
                <button
                  className="text-ink hover:text-accent underline-offset-2 hover:underline transition-colors"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
