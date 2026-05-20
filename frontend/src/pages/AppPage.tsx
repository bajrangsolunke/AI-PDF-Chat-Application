import { useEffect, useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { ChatSurface } from "@/components/chat/ChatSurface";
import { UploadDrawer } from "@/components/pdf/UploadDrawer";
import { SourcePanel } from "@/components/chat/SourcePanel";
import { useSession, useUpdateSessionPdfs } from "@/services/chat";

export default function AppPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);

  const { data: session } = useSession(activeSessionId);
  const updateSessionPdfs = useUpdateSessionPdfs();

  useEffect(() => {
    if (session) setSelectedPdfIds(session.pdf_ids);
  }, [activeSessionId, session?.id, session?.pdf_ids.join(",")]);

  function handleTogglePdf(id: string) {
    const next = selectedPdfIds.includes(id)
      ? selectedPdfIds.filter((x) => x !== id)
      : [...selectedPdfIds, id];
    setSelectedPdfIds(next);
    if (activeSessionId) {
      updateSessionPdfs.mutate({ sessionId: activeSessionId, pdf_ids: next });
    }
  }

  return (
    <>
      <AppLayout
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          if (id === null) setSelectedPdfIds([]);
        }}
        selectedPdfIds={selectedPdfIds}
        onTogglePdf={handleTogglePdf}
      >
        <ChatSurface
          sessionId={activeSessionId}
          selectedPdfIds={selectedPdfIds}
          onSessionCreated={setActiveSessionId}
        />
      </AppLayout>
      <UploadDrawer />
      <SourcePanel />
    </>
  );
}
