import { useTranslation } from "../lib/i18n";

interface FileInfoProps {
  fileName: string;
  fileSize: string;
  onRemove: () => void;
}

export function FileInfo({ fileName, fileSize, onRemove }: FileInfoProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg border border-outline-variant">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-3xl">description</span>
        <div>
          <p className="font-semibold text-label-md text-on-surface truncate max-w-[200px]">
            {fileName}
          </p>
          <p className="text-body-sm text-on-surface-variant">{fileSize}</p>
        </div>
      </div>
      <button
        className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors"
        onClick={onRemove}
        aria-label={t("fileInfo.removeFile")}
      >
        close
      </button>
    </div>
  );
}
