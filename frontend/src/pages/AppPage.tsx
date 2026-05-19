import { useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { ChatSurface } from "@/components/chat/ChatSurface";
import { UploadDrawer } from "@/components/pdf/UploadDrawer";

export default function AppPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);

  return (
    <>
      <AppLayout
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          if (id === null) setSelectedPdfIds([]);
        }}
        selectedPdfIds={selectedPdfIds}
        onTogglePdf={(id) =>
          setSelectedPdfIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          )
        }
      >
        <ChatSurface
          sessionId={activeSessionId}
          selectedPdfIds={selectedPdfIds}
          onSessionCreated={setActiveSessionId}
        />
      </AppLayout>
      <UploadDrawer />
    </>
  );
}
