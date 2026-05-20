import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Pdf } from "@/types/api";

export const usePdfs = (refetchMs = 4000) =>
  useQuery({
    queryKey: ["pdfs"],
    queryFn: async () => (await api.get<Pdf[]>("/pdfs")).data,
    refetchInterval: (q) => {
      const data = q.state.data;
      return data?.some((p) => p.status === "processing") ? refetchMs : false;
    },
  });

export const useUploadPdfs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      return (await api.post<Pdf[]>("/pdfs", fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pdfs"] }),
  });
};

export const useDeletePdf = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/pdfs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pdfs"] }),
  });
};
