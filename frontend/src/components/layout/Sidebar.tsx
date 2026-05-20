import { Plus, Moon, Sun, LogOut, Upload } from "lucide-react";
import { useSessions } from "@/services/chat";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { PdfList } from "@/components/pdf/PdfList";
import { Wordmark } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  selectedPdfIds: string[];
  onTogglePdf: (id: string) => void;
}

export function Sidebar({
  activeSessionId,
  onSelectSession,
  selectedPdfIds,
  onTogglePdf,
}: SidebarProps) {
  const { data: sessions = [] } = useSessions();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode, setUploadOpen } = useUiStore();

  return (
    <aside className="w-72 shrink-0 border-r border-rule flex flex-col h-screen bg-surface">
      {/* Top bar: wordmark + new chat */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <Wordmark className="text-lg" />
        <button
          className="text-sm text-ink hover:text-accent inline-flex items-center gap-2 transition-colors"
          onClick={() => onSelectSession(null)}
          title="New chat"
        >
          <Plus className="size-3.5" />
          <span>New chat</span>
        </button>
      </div>

      {/* Sessions section */}
      <div className="px-5 pt-5">
        <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-ink-soft pb-2 border-b border-rule">
          Archive
        </p>
      </div>
      <ul className="px-3 mt-1 space-y-0.5 max-h-48 overflow-y-auto">
        {sessions.map((s) => (
          <li key={s.id} className="relative">
            {/* Left accent strip for active */}
            {activeSessionId === s.id && (
              <span className="absolute left-0 top-0 h-full w-0.5 bg-accent rounded-full" />
            )}
            <button
              className={cn(
                "w-full text-left pl-3 pr-2 py-1.5 text-sm truncate transition-colors",
                activeSessionId === s.id
                  ? "text-ink"
                  : "text-ink-muted hover:text-ink",
                "hover:underline underline-offset-2",
              )}
              onClick={() => onSelectSession(s.id)}
            >
              {s.title}
            </button>
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="pl-3 py-1.5 text-xs text-ink-soft italic">
            No chats yet.
          </li>
        )}
      </ul>

      {/* PDFs / Library section */}
      <div className="px-5 pt-5 flex items-center justify-between">
        <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-ink-soft pb-2 border-b border-rule flex-1">
          Library
        </p>
        <button
          className="ml-2 pb-2 text-ink-soft hover:text-accent inline-flex items-center gap-1 text-xs transition-colors"
          onClick={() => setUploadOpen(true)}
          title="Add documents"
        >
          <Upload className="size-3" />
        </button>
      </div>
      <div className="px-3 flex-1 overflow-y-auto mt-1">
        <PdfList selectedIds={selectedPdfIds} onToggle={onTogglePdf} />
      </div>

      {/* Bottom user bar */}
      <div className="border-t border-rule px-5 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-muted font-sans truncate max-w-[140px]">
            {user?.email}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="text-ink-soft hover:text-accent transition-colors p-1"
              onClick={toggleDarkMode}
              title="Toggle theme"
            >
              {darkMode ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </button>
            <button
              className="text-ink-soft hover:text-accent transition-colors p-1"
              onClick={logout}
              title="Log out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-ink-soft pt-3">
          Powered by Groq · Gemini
        </p>
      </div>
    </aside>
  );
}
