"use client";

import { ImagePlus, Link2, Package, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";

interface ManagedProductImageFieldProps {
  readonly label: string;
  readonly urlInputTestId: string;
  readonly fileInputTestId: string;
  readonly imageUrl: string;
  readonly imageFile: File | null;
  readonly onImageUrlChange: (value: string) => void;
  readonly onImageFileChange: (file: File | null) => void;
  readonly previewAlt: string;
  readonly currentImageUrl?: string;
  readonly className?: string;
}

export function ManagedProductImageField({
  label,
  urlInputTestId,
  fileInputTestId,
  imageUrl,
  imageFile,
  onImageUrlChange,
  onImageFileChange,
  previewAlt,
  currentImageUrl,
  className,
}: ManagedProductImageFieldProps): JSX.Element {
  const { messages } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setFilePreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(imageFile);
    setFilePreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [imageFile]);

  const previewUrl = useMemo(() => {
    if (filePreviewUrl) {
      return filePreviewUrl;
    }

    if (imageUrl.trim().length > 0) {
      return imageUrl.trim();
    }

    return currentImageUrl;
  }, [currentImageUrl, filePreviewUrl, imageUrl]);

  const fileSelectionLabel = imageFile
    ? messages.productsWorkspace.forms.imageSelectedFile(imageFile.name)
    : messages.productsWorkspace.forms.imageNoFileSelected;

  return (
    <div className={["grid gap-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[12rem_minmax(0,1fr)]", className]
      .filter(Boolean)
      .join(" ")}
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <div className="flex h-[12rem] items-center justify-center overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Preview can point to managed storage, data URLs or operator-entered remote URLs before ingestion.
            <img
              src={previewUrl}
              alt={previewAlt}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Package size={36} />
              <span className="text-xs font-medium text-slate-500">
                {messages.productsWorkspace.forms.imageEmptyLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Upload size={16} className="text-blue-600" />
                {messages.productsWorkspace.forms.imageUploadLabel}
              </p>
              <p className="mt-1 text-xs text-slate-500">{fileSelectionLabel}</p>
            </div>
            {imageFile ? (
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                  onImageFileChange(null);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                <X size={14} />
                {messages.common.actions.clearFile}
              </button>
            ) : null}
          </div>

          <div className="mt-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <ImagePlus size={16} />
              {messages.common.actions.chooseFile}
              <input
                ref={fileInputRef}
                data-testid={fileInputTestId}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  onImageFileChange(nextFile);
                }}
              />
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-2 rounded-[1.4rem] border border-slate-200 bg-white p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Link2 size={16} className="text-blue-600" />
            {messages.productsWorkspace.forms.imageUrlLabel}
          </span>
          <input
            data-testid={urlInputTestId}
            value={imageUrl}
            onChange={(event) => onImageUrlChange(event.target.value)}
            placeholder={messages.common.placeholders.imageUrl}
            className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none focus:border-blue-400"
          />
          <p className="text-xs leading-relaxed text-slate-500">
            {messages.productsWorkspace.forms.imageReplaceHint}
          </p>
        </label>
      </div>
    </div>
  );
}
