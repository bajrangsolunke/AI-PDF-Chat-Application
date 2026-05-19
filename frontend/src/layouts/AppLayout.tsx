import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

interface Props {
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  selectedPdfIds: string[];
  onTogglePdf: (id: string) => void;
  children: ReactNode;
}

export function AppLayout(props: Props) {
  return (
    <div className="flex h-screen">
      <Sidebar
        activeSessionId={props.activeSessionId}
        onSelectSession={props.onSelectSession}
        selectedPdfIds={props.selectedPdfIds}
        onTogglePdf={props.onTogglePdf}
      />
      <main className="flex-1 flex flex-col min-w-0">{props.children}</main>
    </div>
  );
}
