import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

export default function AppPage() {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Hello, {user?.email}</h1>
        <Button variant="ghost" onClick={logout}>Log out</Button>
      </div>
      <p className="mt-4 text-slate-500">Chat UI coming in Phase 6…</p>
    </div>
  );
}
