type IconProps = { size?: number; className?: string };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconSearch({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" {...stroke} />
      <path d="M20 20l-3.6-3.6" {...stroke} />
    </svg>
  );
}

export function IconPlus({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" {...stroke} />
    </svg>
  );
}

export function IconClose({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6l-12 12" {...stroke} />
    </svg>
  );
}

export function IconTrash({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13" {...stroke} />
    </svg>
  );
}

export function IconDownload({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 4v10M8 11l4 4 4-4M5 20h14" {...stroke} />
    </svg>
  );
}

export function IconUpload({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 15V5M8 8l4-4 4 4M5 20h14" {...stroke} />
    </svg>
  );
}
