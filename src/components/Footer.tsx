export function Footer() {
  return (
    <footer className="bg-surface dark:bg-background border-t border-outline-variant dark:border-outline py-8 mt-auto">
      <div className="flex flex-col items-center gap-element-gap max-w-[640px] mx-auto w-full">
        <div className="flex items-center gap-2 opacity-80">
          <span className="text-label-md font-semibold text-primary">ShrinkPDF</span>
          <span className="text-on-surface-variant text-label-sm">|</span>
          <span className="text-on-surface-variant text-label-sm">© {new Date().getFullYear()} ShrinkPDF. Secure &amp; Private.</span>
        </div>
        <div className="flex gap-6">
          <a className="text-on-surface-variant text-label-sm hover:text-primary transition-colors" href="#">Terms</a>
          <a className="text-on-surface-variant text-label-sm hover:text-primary transition-colors" href="#">Privacy</a>
          <a className="text-on-surface-variant text-label-sm hover:text-primary transition-colors" href="#">API</a>
        </div>
      </div>
    </footer>
  )
}
