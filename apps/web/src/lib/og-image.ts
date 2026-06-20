import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { fontBuffer, pjs400, pjs600, syne800 } from './og-fonts';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const COLORS = {
  ink: '#0f1a2e',
  inkMuted: '#5a6b7d',
  brand: '#2679a3',
  brandDeep: '#006699',
  brandLight: '#bcdcec',
  accent: '#6b4eff',
  paper: '#f4f8fa',
  border: '#d8e3ec',
};

export interface OgImageOptions {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Small stat chips shown above the footer, e.g. ["120 listings", "€1,200/mo median"]. */
  stats?: string[];
}

type SatoriNode = {
  type: string;
  props: { style?: Record<string, unknown>; children?: unknown; [key: string]: unknown };
};

function el(
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
): SatoriNode {
  return { type, props: { style, ...(children !== undefined ? { children } : {}) } };
}

function clamp(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

function logoMark(): SatoriNode {
  return el(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 76,
      height: 76,
      borderRadius: 20,
      backgroundImage: `linear-gradient(135deg, ${COLORS.brand} 0%, ${COLORS.brandDeep} 100%)`,
      boxShadow: '0 10px 30px rgba(38, 121, 163, 0.35)',
    },
    el(
      'div',
      {
        display: 'flex',
        fontFamily: 'Syne',
        fontWeight: 800,
        fontSize: 48,
        color: '#ffffff',
        lineHeight: 1,
        marginTop: -4,
      },
      'R',
    ),
  );
}

function wordmark(): SatoriNode {
  return el(
    'div',
    { display: 'flex', alignItems: 'baseline', fontFamily: 'Syne', fontWeight: 800, fontSize: 40 },
    [
      el('span', { color: COLORS.ink }, 'renting'),
      el('span', { color: COLORS.brand }, '.'),
      el('span', { color: COLORS.brandDeep }, 'berlin'),
    ],
  );
}

function eyebrowPill(text: string): SatoriNode {
  return el(
    'div',
    {
      display: 'flex',
      alignSelf: 'flex-start',
      alignItems: 'center',
      padding: '10px 22px',
      borderRadius: 999,
      border: `2px solid ${COLORS.brandLight}`,
      backgroundColor: 'rgba(255,255,255,0.7)',
      color: COLORS.brandDeep,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 600,
      fontSize: 22,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    clamp(text, 48),
  );
}

function statChip(text: string): SatoriNode {
  return el(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 22px',
      borderRadius: 16,
      backgroundColor: '#ffffff',
      border: `2px solid ${COLORS.border}`,
      color: COLORS.brandDeep,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 600,
      fontSize: 26,
    },
    clamp(text, 28),
  );
}

function buildTree(opts: OgImageOptions): SatoriNode {
  const { title, subtitle, eyebrow, stats } = opts;
  const children: SatoriNode[] = [];

  children.push(
    el('div', { display: 'flex', alignItems: 'center', gap: 20 }, [logoMark(), wordmark()]),
  );

  children.push(el('div', { display: 'flex', flex: 1 }, ''));

  const block: SatoriNode[] = [];
  if (eyebrow) block.push(eyebrowPill(eyebrow));
  block.push(
    el(
      'div',
      {
        display: 'flex',
        fontFamily: 'Syne',
        fontWeight: 800,
        fontSize: title.length > 42 ? 60 : 72,
        lineHeight: 1.05,
        color: COLORS.ink,
        marginTop: eyebrow ? 26 : 0,
        maxWidth: 1000,
      },
      clamp(title, 110),
    ),
  );
  if (subtitle) {
    block.push(
      el(
        'div',
        {
          display: 'flex',
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 400,
          fontSize: 30,
          lineHeight: 1.35,
          color: COLORS.inkMuted,
          marginTop: 20,
          maxWidth: 960,
        },
        clamp(subtitle, 170),
      ),
    );
  }

  children.push(el('div', { display: 'flex', flexDirection: 'column' }, block));

  if (stats && stats.length > 0) {
    children.push(
      el(
        'div',
        { display: 'flex', gap: 16, marginTop: 36, flexWrap: 'wrap' },
        stats.slice(0, 4).map((s) => statChip(s)),
      ),
    );
  }

  children.push(
    el(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        marginTop: stats && stats.length > 0 ? 28 : 36,
        fontFamily: 'Plus Jakarta Sans',
        fontWeight: 600,
        fontSize: 24,
        color: COLORS.brand,
      },
      'Find your place in Berlin · Trust built in',
    ),
  );

  return el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      width: OG_WIDTH,
      height: OG_HEIGHT,
      padding: 64,
      backgroundColor: COLORS.paper,
      backgroundImage: `linear-gradient(135deg, #f4f8fa 0%, #e8f4fa 48%, #ede9ff 100%)`,
      borderBottom: `14px solid ${COLORS.brand}`,
      fontFamily: 'Plus Jakarta Sans',
    },
    children,
  );
}

const fonts = [
  { name: 'Syne', data: fontBuffer(syne800), weight: 800 as const, style: 'normal' as const },
  { name: 'Plus Jakarta Sans', data: fontBuffer(pjs400), weight: 400 as const, style: 'normal' as const },
  { name: 'Plus Jakarta Sans', data: fontBuffer(pjs600), weight: 600 as const, style: 'normal' as const },
];

export async function renderOgPng(opts: OgImageOptions): Promise<Buffer> {
  const svg = await satori(buildTree(opts) as unknown as React.ReactNode, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } });
  return resvg.render().asPng();
}
