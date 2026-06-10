import { createContext, useContext, type ReactNode } from "react";
import { createElement } from "react";

export type Lang = "en" | "es";

export function detectLang(): Lang {
  const raw = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
  return raw.startsWith("es") ? "es" : "en";
}

const en = {
  "app.title": "Compress PDF",
  "app.subtitle":
    "Reduce file size while preserving quality. 100% private — processed in your browser.",
  "app.error.notPdf": "Please select a PDF file.",
  "app.error.encrypted": "This PDF is password-protected/encrypted, which is not supported.",
  "app.error.corrupt":
    "Could not compress this PDF. It may be corrupted or use an unsupported format.",
  "header.toggleDark": "Toggle dark mode",
  "footer.copyright": "© {year} ShrinkPDF. Secure & Private.",
  "footer.terms": "Terms",
  "footer.privacy": "Privacy",
  "footer.api": "API",
  "dropzone.heading": "Drop your PDF here",
  "dropzone.subheading": "or choose file from your device",
  "fileInfo.removeFile": "Remove file",
  "compressionSettings.label": "Compression level",
  "compressionSettings.screen.title": "Smallest file",
  "compressionSettings.screen.detail": "Max compression · 72 dpi · email & on-screen",
  "compressionSettings.ebook.title": "Balanced",
  "compressionSettings.ebook.detail": "Good quality · 150 dpi · reading on devices",
  "compressionSettings.print.title": "Best quality",
  "compressionSettings.print.detail": "Light compression · 300 dpi · printing",
  "compressButton.compress": "Compress PDF",
  "compressButton.compressing": "Compressing...",
  "results.alreadyOptimized": "Already optimized",
  "results.complete": "Compression complete!",
  "results.unchangedBody":
    "This PDF was already as small as we can make it — your original was kept unchanged ({mb}).",
  "results.sizeComparison": "Original: {originalSize} → Compressed: {compressedSize}",
  "results.savings": "Saved {savings}%",
  "results.imagesRecompressed": " · {count} images recompressed",
  "results.savedTo": "Saved to {fileName}",
  "results.download": "Download compressed file",
  "results.compressAnother": "Compress another file",
} as const;

type TranslationKey = keyof typeof en;
type Translations = Record<TranslationKey, string>;

const es: Translations = {
  "app.title": "Comprimir PDF",
  "app.subtitle": "Reduce el tamaño sin perder calidad. 100% privado — procesado en tu navegador.",
  "app.error.notPdf": "Por favor selecciona un archivo PDF.",
  "app.error.encrypted": "Este PDF está protegido con contraseña, lo cual no es compatible.",
  "app.error.corrupt":
    "No se pudo comprimir este PDF. Puede estar dañado o en un formato no compatible.",
  "header.toggleDark": "Alternar modo oscuro",
  "footer.copyright": "© {year} ShrinkPDF. Seguro y Privado.",
  "footer.terms": "Términos",
  "footer.privacy": "Privacidad",
  "footer.api": "API",
  "dropzone.heading": "Suelta tu PDF aquí",
  "dropzone.subheading": "o elige un archivo de tu dispositivo",
  "fileInfo.removeFile": "Eliminar archivo",
  "compressionSettings.label": "Nivel de compresión",
  "compressionSettings.screen.title": "Archivo más pequeño",
  "compressionSettings.screen.detail": "Máxima compresión · 72 dpi · email y pantalla",
  "compressionSettings.ebook.title": "Equilibrado",
  "compressionSettings.ebook.detail": "Buena calidad · 150 dpi · lectura en dispositivos",
  "compressionSettings.print.title": "Mejor calidad",
  "compressionSettings.print.detail": "Compresión leve · 300 dpi · impresión",
  "compressButton.compress": "Comprimir PDF",
  "compressButton.compressing": "Comprimiendo...",
  "results.alreadyOptimized": "Ya está optimizado",
  "results.complete": "¡Compresión completada!",
  "results.unchangedBody":
    "Este PDF ya era tan pequeño como podemos hacerlo — se conservó el original ({mb}).",
  "results.sizeComparison": "Original: {originalSize} → Comprimido: {compressedSize}",
  "results.savings": "Ahorraste {savings}%",
  "results.imagesRecompressed": " · {count} imágenes recomprimidas",
  "results.savedTo": "Guardado en {fileName}",
  "results.download": "Descargar archivo comprimido",
  "results.compressAnother": "Comprimir otro archivo",
};

const dictionaries: Record<Lang, Translations> = { en, es };

function buildT(lang: Lang) {
  const dict = dictionaries[lang];
  return function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let str = dict[key];
    if (vars) {
      str = str.replace(/{(\w+)}/g, (_, k) => String(vars[k] ?? ""));
    }
    return str;
  };
}

type TFn = ReturnType<typeof buildT>;

interface I18nContextValue {
  t: TFn;
  lang: Lang;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  children: ReactNode;
}

export function I18nProvider({ lang, children }: I18nProviderProps) {
  const t = buildT(lang);
  return createElement(I18nContext.Provider, { value: { t, lang } }, children);
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
