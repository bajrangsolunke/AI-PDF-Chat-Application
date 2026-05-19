import { Plus, Upload, Moon, Sun, LogOut } from "lucide-react";
import { useSessions } from "@/services/chat";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { PdfList } from "@/components/pdf/PdfList";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  selectedPdfIds: string[];
  onTogglePdf: (id: string) => void;
}

export function Sidebar({ activeSessionId, onSelectSession, selectedPdfIds, onTogglePdf }: SidebarProps) {
  const { data: sessions = [] } = useSessions();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode, setUploadOpen } = useUiStore();

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen">
      <div className="p-3">
        <Button className="w-full justify-start gap-2" onClick={() => onSelectSession(null)}>
          <Plus className="size-4" /> New chat
        </Button>
      </div>

      <div className="px-3 pt-2 pb-1 text-xs uppercase tracking-wide text-slate-500">Recent chats</div>
      <ul className="px-2 space-y-0.5 max-h-48 overflow-y-auto">
        {sessions.map((s) => (
          <li
            key={s.id}
            className={cn(
              "px-2 py-1.5 rounded-lg text-sm truncate cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800",
              activeSessionId === s.id && "bg-slate-100 dark:bg-slate-800",
            )}
            onClick={() => onSelectSession(s.id)}
          >
            {s.title}
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="px-2 py-1.5 text-xs text-slate-500">No chats yet.</li>
        )}
      </ul>

      <div className="mt-3 px-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-500">My PDFs</span>
        <button className="text-xs text-brand hover:underline inline-flex items-center gap-1" onClick={() => setUploadOpen(true)}>
          <Upload className="size-3" /> Upload
        </button>
      </div>
      <div className="px-1 flex-1 overflow-y-auto">
        <PdfList selectedIds={selectedPdfIds} onToggle={onTogglePdf} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between">
        <span className="text-xs text-slate-500 truncate">{user?.email}</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" onClick={toggleDarkMode} title="Toggle theme">
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" onClick={logout} title="Log out">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
