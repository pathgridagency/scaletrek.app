export type ThemeMode = 'light' | 'dark';

export interface Palette {
  background: string;
  card: string;
  surface: string;
  surfaceAlt: string;
  surfaceElev: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  divider: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  textInverse: string;

  accent: string;
  accentSubtle: string;
  accentBorder: string;
  accentOn: string;
  accentGradient: [string, string];

  dreamer: string;
  dreamerSubtle: string;
  dreamerBorder: string;
  dreamerGradient: [string, string];

  reality: string;
  realitySubtle: string;
  realityBorder: string;
  realityGradient: [string, string];

  admin: string;
  adminSubtle: string;
  adminBorder: string;

  pro: string;
  proSubtle: string;
  proBorder: string;
  proGradient: [string, string];

  elite: string;
  eliteSubtle: string;
  eliteBorder: string;
  eliteGradient: [string, string];

  success: string;
  warning: string;
  error: string;
  info: string;

  overlay: string;
  overlayStrong: string;
  shadow: string;
  shadowStrong: string;
  white: string;
  black: string;

  statusBar: 'light-content' | 'dark-content';
}

export const lightPalette: Palette = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  surface: '#F4F4F5',
  surfaceAlt: '#EDEDEF',
  surfaceElev: '#FFFFFF',
  border: 'rgba(0,0,0,0.08)',
  borderSubtle: 'rgba(0,0,0,0.05)',
  borderStrong: 'rgba(0,0,0,0.14)',
  divider: 'rgba(0,0,0,0.06)',

  textPrimary: 'rgba(9,9,11,0.95)',
  textSecondary: 'rgba(9,9,11,0.62)',
  textMuted: 'rgba(9,9,11,0.42)',
  textDim: 'rgba(9,9,11,0.28)',
  textInverse: '#FFFFFF',

  accent: '#5B5BD6',
  accentSubtle: 'rgba(91,91,214,0.08)',
  accentBorder: 'rgba(91,91,214,0.22)',
  accentOn: '#FFFFFF',
  accentGradient: ['#6366F1', '#8B5CF6'],

  dreamer: '#5B5BD6',
  dreamerSubtle: 'rgba(91,91,214,0.08)',
  dreamerBorder: 'rgba(91,91,214,0.22)',
  dreamerGradient: ['#6366F1', '#A855F7'],

  reality: '#059669',
  realitySubtle: 'rgba(5,150,105,0.08)',
  realityBorder: 'rgba(5,150,105,0.22)',
  realityGradient: ['#10B981', '#059669'],

  admin: '#C2410C',
  adminSubtle: 'rgba(194,65,12,0.08)',
  adminBorder: 'rgba(194,65,12,0.22)',

  pro: '#5B5BD6',
  proSubtle: 'rgba(91,91,214,0.10)',
  proBorder: 'rgba(91,91,214,0.30)',
  proGradient: ['#6366F1', '#8B5CF6'],

  elite: '#D97706',
  eliteSubtle: 'rgba(217,119,6,0.10)',
  eliteBorder: 'rgba(217,119,6,0.30)',
  eliteGradient: ['#FBBF24', '#D97706'],

  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  overlay: 'rgba(9,9,11,0.35)',
  overlayStrong: 'rgba(9,9,11,0.65)',
  shadow: 'rgba(9,9,11,0.06)',
  shadowStrong: 'rgba(9,9,11,0.14)',
  white: '#FFFFFF',
  black: '#000000',

  statusBar: 'dark-content',
};

export const darkPalette: Palette = {
  background: '#09090B',
  card: '#131316',
  surface: '#1A1A1F',
  surfaceAlt: '#0F0F12',
  surfaceElev: '#1F1F25',
  border: 'rgba(255,255,255,0.08)',
  borderSubtle: 'rgba(255,255,255,0.05)',
  borderStrong: 'rgba(255,255,255,0.14)',
  divider: 'rgba(255,255,255,0.06)',

  textPrimary: 'rgba(250,250,250,0.96)',
  textSecondary: 'rgba(250,250,250,0.66)',
  textMuted: 'rgba(250,250,250,0.46)',
  textDim: 'rgba(250,250,250,0.30)',
  textInverse: '#09090B',

  accent: '#818CF8',
  accentSubtle: 'rgba(129,140,248,0.12)',
  accentBorder: 'rgba(129,140,248,0.32)',
  accentOn: '#09090B',
  accentGradient: ['#818CF8', '#C084FC'],

  dreamer: '#818CF8',
  dreamerSubtle: 'rgba(129,140,248,0.12)',
  dreamerBorder: 'rgba(129,140,248,0.32)',
  dreamerGradient: ['#818CF8', '#C084FC'],

  reality: '#34D399',
  realitySubtle: 'rgba(52,211,153,0.12)',
  realityBorder: 'rgba(52,211,153,0.32)',
  realityGradient: ['#34D399', '#10B981'],

  admin: '#FB923C',
  adminSubtle: 'rgba(251,146,60,0.12)',
  adminBorder: 'rgba(251,146,60,0.32)',

  pro: '#A78BFA',
  proSubtle: 'rgba(167,139,250,0.14)',
  proBorder: 'rgba(167,139,250,0.38)',
  proGradient: ['#818CF8', '#C084FC'],

  elite: '#FBBF24',
  eliteSubtle: 'rgba(251,191,36,0.14)',
  eliteBorder: 'rgba(251,191,36,0.38)',
  eliteGradient: ['#FBBF24', '#F97316'],

  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  overlay: 'rgba(0,0,0,0.65)',
  overlayStrong: 'rgba(0,0,0,0.82)',
  shadow: 'rgba(0,0,0,0.5)',
  shadowStrong: 'rgba(0,0,0,0.7)',
  white: '#FFFFFF',
  black: '#000000',

  statusBar: 'light-content',
};

export const Typography = {
  fontSizeXS: 11,
  fontSizeSM: 13,
  fontSizeMD: 15,
  fontSizeLG: 17,
  fontSizeXL: 20,
  fontSize2XL: 24,
  fontSize3XL: 28,
  fontSize4XL: 34,
  fontSize5XL: 44,
  fontSizeDisplay: 56,
  fontWeightLight: '300' as const,
  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold: '700' as const,
  fontWeightExtrabold: '800' as const,
  fontWeightBlack: '900' as const,
  letterTight: -0.6,
  letterDisplay: -1.2,
  letterNormal: 0,
  letterWide: 0.3,
  lineTight: 1.1,
  lineNormal: 1.35,
  lineRelaxed: 1.55,
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  huge: 56,
  massive: 72,
};

export const Radii = {
  xs: 3,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const Motion = {
  fast: 150,
  normal: 220,
  slow: 320,
  pageEnter: 280,
  easeOut: [0.16, 1, 0.3, 1] as const,
  easeIn: [0.7, 0, 0.84, 0] as const,
  easeInOut: [0.65, 0, 0.35, 1] as const,
};

export interface Elevation {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const elevationFor = (palette: Palette, level: 'none' | 'sm' | 'md' | 'lg' | 'xl'): Elevation => {
  switch (level) {
    case 'sm':
      return {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: palette === darkPalette ? 0.4 : 0.04,
        shadowRadius: 2,
        elevation: 2,
      };
    case 'md':
      return {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: palette === darkPalette ? 0.5 : 0.08,
        shadowRadius: 8,
        elevation: 4,
      };
    case 'lg':
      return {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: palette === darkPalette ? 0.55 : 0.12,
        shadowRadius: 16,
        elevation: 8,
      };
    case 'xl':
      return {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: palette === darkPalette ? 0.6 : 0.18,
        shadowRadius: 28,
        elevation: 16,
      };
    default:
      return {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
      };
  }
};

export type AccentKind = 'dreamer' | 'reality' | 'admin' | 'accent' | 'pro' | 'elite';

export const accentFor = (palette: Palette, kind: AccentKind) => {
  if (kind === 'reality')
    return {
      primary: palette.reality,
      subtle: palette.realitySubtle,
      border: palette.realityBorder,
      gradient: palette.realityGradient,
    };
  if (kind === 'admin')
    return {
      primary: palette.admin,
      subtle: palette.adminSubtle,
      border: palette.adminBorder,
      gradient: [palette.admin, palette.admin] as [string, string],
    };
  if (kind === 'accent')
    return {
      primary: palette.accent,
      subtle: palette.accentSubtle,
      border: palette.accentBorder,
      gradient: palette.accentGradient,
    };
  if (kind === 'pro')
    return {
      primary: palette.pro,
      subtle: palette.proSubtle,
      border: palette.proBorder,
      gradient: palette.proGradient,
    };
  if (kind === 'elite')
    return {
      primary: palette.elite,
      subtle: palette.eliteSubtle,
      border: palette.eliteBorder,
      gradient: palette.eliteGradient,
    };
  return {
    primary: palette.dreamer,
    subtle: palette.dreamerSubtle,
    border: palette.dreamerBorder,
    gradient: palette.dreamerGradient,
  };
};
