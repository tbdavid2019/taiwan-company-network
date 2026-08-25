import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildGraphShareText } from "@/lib/boxShare";
import { graphShareFileName } from "@/lib/graphShare";

export function GraphShareDialog({
  isOpen,
  onClose,
  company,
  blob,
  imageUrl,
  shareUrl,
  uploadError,
  isUploading,
  pageUrl,
}) {
  const [copiedType, setCopiedType] = useState(null);
  const [previewSrc, setPreviewSrc] = useState("");

  useEffect(() => {
    if (!blob) {
      setPreviewSrc("");
      return undefined;
    }
    const url = URL.createObjectURL(blob);
    setPreviewSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const shareText = useMemo(
    () => buildGraphShareText({ company, pageUrl, imageUrl, shareUrl }),
    [company, imageUrl, pageUrl, shareUrl],
  );

  const copyToClipboard = async (text, type) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopiedType(type);
      setTimeout(() => setCopiedType((curr) => (curr === type ? null : curr)), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const handleDownload = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = graphShareFileName(company);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      const shareData = {
        title: `${company} - 888台灣的公司關係網`,
        text: shareText,
        url: pageUrl || undefined,
      };
      if (blob && navigator.canShare) {
        const file = new File([blob], graphShareFileName(company), { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      }
      await navigator.share(shareData);
    } catch (err) {
      if (err?.name !== "AbortError") {
        // Ignored
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      aria-labelledby="share-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Share2 className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold" id="share-dialog-title">
                分享關係圖
              </h2>
              <p className="text-xs text-muted-foreground">{company || "888台灣公司關係網"}</p>
            </div>
          </div>
          <Button
            aria-label="關閉"
            className="size-8 rounded-full"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
          {/* Image preview & upload status badge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">圖片預覽</span>
              {isUploading ? (
                <Badge className="gap-1 text-muted-foreground" variant="secondary">
                  <LoaderCircle className="size-3 animate-spin text-primary" />
                  上傳 888box 中…
                </Badge>
              ) : imageUrl ? (
                <Badge className="gap-1 border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300" variant="outline">
                  <Cloud className="size-3 text-sky-500" />
                  已託管至 888box CDN
                </Badge>
              ) : uploadError ? (
                <Badge className="text-destructive" variant="outline">
                  888box 上傳失敗（可直接下載 PNG）
                </Badge>
              ) : null}
            </div>

            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border/70 bg-[#faf8f5]">
              {previewSrc ? (
                <img
                  alt={`${company} 關係圖預覽`}
                  className="h-full w-full object-contain p-2"
                  src={previewSrc}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <LoaderCircle className="size-6 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Links & Cloud Actions */}
          <div className="space-y-3">
            {/* 888box Hosted Image URL */}
            {imageUrl && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 dark:border-sky-900/50 dark:bg-sky-950/30">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-sky-800 dark:text-sky-200">
                    <ImageIcon className="size-3.5" />
                    888box 圖片網址 (WebP CDN)
                  </span>
                  {shareUrl && (
                    <a
                      className="flex items-center gap-1 text-[11px] text-sky-600 hover:underline dark:text-sky-400"
                      href={shareUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span>開啟預覽頁</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="h-8 flex-1 rounded-lg border border-sky-200/80 bg-background px-2.5 text-xs text-foreground select-all focus:outline-hidden dark:border-sky-800"
                    readOnly
                    type="text"
                    value={imageUrl}
                  />
                  <Button
                    className="h-8 shrink-0 gap-1 text-xs"
                    onClick={() => copyToClipboard(imageUrl, "image")}
                    size="sm"
                    variant="outline"
                  >
                    {copiedType === "image" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    {copiedType === "image" ? "已複製" : "複製網址"}
                  </Button>
                </div>
              </div>
            )}

            {/* Site Page URL */}
            {pageUrl && (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Link2 className="size-3.5 text-primary" />
                    本站關係圖連結
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="h-8 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground select-all focus:outline-hidden"
                    readOnly
                    type="text"
                    value={pageUrl}
                  />
                  <Button
                    className="h-8 shrink-0 gap-1 text-xs"
                    onClick={() => copyToClipboard(pageUrl, "page")}
                    size="sm"
                    variant="outline"
                  >
                    {copiedType === "page" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    {copiedType === "page" ? "已複製" : "複製連結"}
                  </Button>
                </div>
              </div>
            )}

            {/* Complete Share Copy */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Sparkles className="size-3.5 text-amber-500" />
                  完整社群分享文案
                </span>
                <Button
                  className="h-6 px-2 text-[11px]"
                  onClick={() => copyToClipboard(shareText, "text")}
                  size="sm"
                  variant="ghost"
                >
                  {copiedType === "text" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  {copiedType === "text" ? "已複製文案" : "複製完整文案"}
                </Button>
              </div>
              <textarea
                className="w-full rounded-xl border border-border/70 bg-muted/30 p-2.5 text-xs leading-5 text-muted-foreground select-all focus:outline-hidden"
                readOnly
                rows={4}
                value={shareText}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/20 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <Button className="gap-1.5" onClick={handleDownload} size="sm" variant="outline">
              <Download className="size-3.5" />
              下載 PNG
            </Button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <Button className="gap-1.5" onClick={handleNativeShare} size="sm" variant="outline">
                <Share2 className="size-3.5" />
                系統分享
              </Button>
            )}
          </div>
          <Button onClick={onClose} size="sm">
            完成
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GraphShareDialog;
