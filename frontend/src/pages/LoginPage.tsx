import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="text-sm text-slate-500 mt-1">AI PDF Chat</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : mode === "login" ? "Log in" : "Sign up"}
          </Button>
        </form>
        <button
          className="mt-4 text-sm text-brand hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </button>
      </Card>
    </div>
  );
}
