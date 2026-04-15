import { useCallback, useMemo, useState } from "react";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/chat/file-validation";

interface ChatComposerState {
  canSend: boolean;
  clearComposer: () => void;
  restoreComposer: (text: string, files: File[]) => void;
  input: string;
  mentionIndex: number;
  pendingFiles: File[];
  setInput: (value: string) => void;
  setMentionIndex: (index: number) => void;
  updateInput: (value: string) => void;
  handleFileDrop: (event: React.DragEvent) => void;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileRemove: (index: number) => void;
}

export function useChatComposerState(isSending: boolean): ChatComposerState {
  const [input, setInput] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const canSend = useMemo(
    () => (input.trim().length > 0 || pendingFiles.length > 0) && !isSending,
    [input, isSending, pendingFiles.length],
  );

  const clearComposer = useCallback(() => {
    setInput("");
    setMentionIndex(0);
    setPendingFiles([]);
  }, []);

  const restoreComposer = useCallback((text: string, files: File[]) => {
    setInput(text);
    setPendingFiles(files);
  }, []);

  const updateInput = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFiles = Array.from(event.target.files ?? []);
      if (nextFiles.length === 0) {
        return;
      }

      setPendingFiles((currentFiles) => [...currentFiles, ...nextFiles]);
      event.target.value = "";
    },
    [],
  );

  const handleFileRemove = useCallback((index: number) => {
    setPendingFiles((currentFiles) =>
      currentFiles.filter((_, currentIndex) => currentIndex !== index),
    );
  }, []);

  const handleFileDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (isSending) return;

      const dropped = Array.from(event.dataTransfer.files);
      const valid = dropped.filter(
        (file) =>
          ALLOWED_MIME_TYPES.has(file.type) &&
          file.size <= MAX_FILE_SIZE_BYTES,
      );
      if (valid.length === 0) return;

      setPendingFiles((current) => [...current, ...valid]);
    },
    [isSending],
  );

  return {
    canSend,
    clearComposer,
    restoreComposer,
    input,
    mentionIndex,
    pendingFiles,
    setInput,
    setMentionIndex,
    updateInput,
    handleFileDrop,
    handleFileSelect,
    handleFileRemove,
  };
}