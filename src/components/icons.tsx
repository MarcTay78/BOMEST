const base = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const PlusIcon = () => (
  <svg {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const BackIcon = () => (
  <svg {...base}><path d="m12 19-7-7 7-7M5 12h14" /></svg>
);
export const TrashIcon = () => (
  <svg {...base}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
);
export const EditIcon = () => (
  <svg {...base}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const WarningIcon = ({ size = 15 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
);
