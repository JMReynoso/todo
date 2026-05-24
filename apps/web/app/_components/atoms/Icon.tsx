import type { IconName } from '../../_types';

export interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
}

export function Icon({ name, size = 16, stroke = 1.5, color = 'currentColor' }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'close':
      return (
        <svg {...props}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'more':
      return (
        <svg {...props}>
          <circle cx="5" cy="12" r="1" fill={color} />
          <circle cx="12" cy="12" r="1" fill={color} />
          <circle cx="19" cy="12" r="1" fill={color} />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...props}>
          <path d="M3 6h18M6 12h12M10 18h4" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...props}>
          <path d="M12 3s4 4 4 8a4 4 0 1 1-8 0c0-1.5.6-2.7 1.4-3.6C9 7 10 5.5 12 3z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...props}>
          <path d="M3 12V4h8l10 10-8 8L3 12z" />
          <circle cx="7.5" cy="7.5" r="1.2" fill={color} />
        </svg>
      );
    case 'user':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...props}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...props}>
          <path d="M4 20V10M10 20V4M16 20V14M22 20H2" />
        </svg>
      );
    case 'back':
      return (
        <svg {...props}>
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.21.5.65.91 1.18 1.07.16.05.34.08.51.08H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
        </svg>
      );
    case 'list':
      return (
        <svg {...props}>
          <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
        </svg>
      );
    case 'columns':
      return (
        <svg {...props}>
          <rect x="3.5" y="4" width="4.5" height="16" rx="1" />
          <rect x="9.75" y="4" width="4.5" height="16" rx="1" />
          <rect x="16" y="4" width="4.5" height="16" rx="1" />
        </svg>
      );
    case 'tabs':
      return (
        <svg {...props}>
          <path d="M3.5 9h6V5h11v14H3.5V9z" />
          <path d="M3.5 9h6" />
        </svg>
      );
    case 'stacked':
      return (
        <svg {...props}>
          <rect x="3.5" y="4.5" width="17" height="4" rx="1" />
          <rect x="3.5" y="10" width="17" height="4" rx="1" />
          <rect x="3.5" y="15.5" width="17" height="4" rx="1" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...props}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
        </svg>
      );
    default:
      return null;
  }
}
