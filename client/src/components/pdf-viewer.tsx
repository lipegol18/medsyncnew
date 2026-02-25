import { Loader2, AlertCircle, FileText } from "lucide-react";

interface PdfViewerProps {
  blobUrl: string | null;
  isLoading: boolean;
  error: string | null;
  height?: string;
  width?: string;
  maxWidth?: string;
}

export function PdfViewer({
  blobUrl,
  isLoading,
  error,
  height = "297mm",
  width = "210mm",
  maxWidth,
}: PdfViewerProps) {
  const containerStyle = { width, height, minHeight: "400px", maxWidth: maxWidth || undefined };

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-white border border-red-200 rounded-lg shadow-md"
        style={containerStyle}
      >
        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
        <p className="text-sm text-red-600 font-medium">Erro ao gerar preview</p>
        <p className="text-xs text-red-400 mt-1 max-w-xs text-center">{error}</p>
      </div>
    );
  }

  if (isLoading || !blobUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg shadow-md"
        style={containerStyle}
      >
        <div className="relative">
          <FileText className="h-16 w-16 text-gray-200" />
          <Loader2 className="h-8 w-8 text-medsync-blue animate-spin absolute top-4 left-4" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">Gerando visualizacao do PDF...</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  return (
    <iframe
      src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
      style={containerStyle}
      className="bg-white border border-gray-300 shadow-xl rounded-sm"
      title="Visualizacao do PDF"
    />
  );
}
