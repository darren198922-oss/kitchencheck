export default function SiteFooter({ showBuiltBy = false, className = "" }) {
  return (
    <footer
      className={`text-center px-4 py-6 space-y-1 ${className}`}
      aria-label="Site footer"
    >
      <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
        © 2026 NFD Logic Systems. All rights reserved.
      </p>
      {showBuiltBy && (
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          Built and maintained by NFD Logic Systems.
        </p>
      )}
    </footer>
  );
}
