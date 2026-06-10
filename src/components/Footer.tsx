import { useTranslation } from '../lib/i18n'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-surface dark:bg-background border-t border-outline-variant dark:border-outline py-8 mt-auto">
      <div className="flex flex-col items-center gap-element-gap max-w-[640px] mx-auto w-full">
        <div className="flex items-center gap-2 opacity-80">
          <span className="text-label-md font-semibold text-primary">ShrinkPDF</span>
          <span className="text-on-surface-variant text-label-sm">|</span>
          <span className="text-on-surface-variant text-label-sm">
            {t('footer.copyright', { year })}
          </span>
        </div>
        <div className="flex gap-6">
          <a className="text-on-surface-variant text-label-sm hover:text-primary transition-colors" href="#">
            {t('footer.terms')}
          </a>
          <a className="text-on-surface-variant text-label-sm hover:text-primary transition-colors" href="#">
            {t('footer.privacy')}
          </a>
          <a className="text-on-surface-variant text-label-sm hover:text-primary transition-colors" href="#">
            {t('footer.api')}
          </a>
        </div>
      </div>
    </footer>
  )
}
