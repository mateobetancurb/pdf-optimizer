import { useTranslation, type Lang } from "../lib/i18n";

interface HeaderProps {
  isDark: boolean;
  onToggleDark: () => void;
  lang: Lang;
  onToggleLang: () => void;
}

export function Header({ isDark, onToggleDark, lang, onToggleLang }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="bg-surface dark:bg-background border-b border-outline-variant dark:border-outline fixed top-0 w-full z-50">
      <div className="flex justify-between items-center h-16 px-padding-md max-w-[640px] mx-auto w-full">
        <div className="flex items-center gap-2">
          <svg
            className="w-8 h-8"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="32" height="32" rx="8" fill="#4241bc" />
            <path
              d="M10 8h8l6 6v10a2 2 0 01-2 2H10a2 2 0 01-2-2V10a2 2 0 012-2z"
              fill="white"
              opacity="0.9"
            />
            <path d="M18 8l6 6h-4a2 2 0 01-2-2V8z" fill="white" opacity="0.6" />
            <path d="M12 18h8M12 21h5" stroke="#4241bc" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="font-semibold text-on-surface text-base">ShrinkPDF</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-outline-variant overflow-hidden">
            {(["en", "es"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={onToggleLang}
                aria-pressed={lang === l}
                className={`px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
                  lang === l
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={onToggleDark}
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors"
            aria-label={t("header.toggleDark")}
          >
            <span className="material-symbols-outlined text-on-surface-variant">
              {isDark ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
