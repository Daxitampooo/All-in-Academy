import type { ReactNode } from 'react';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

/** A portrait put together from parts: one line-art style for every bot that has no drawing of its own. */
export type FaceSpec = {
  hair: 'bald' | 'buzz' | 'short' | 'spiky' | 'side' | 'messy' | 'curly' | 'long' | 'bob' | 'bun' | 'ponytail';
  hat?: 'cap' | 'capBack' | 'beanie' | 'hood' | 'headphones';
  eyes: 'dots' | 'wide' | 'narrow' | 'sleepy' | 'glasses' | 'squareGlasses' | 'shades';
  brows?: 'flat' | 'angry' | 'worried' | 'raised';
  /** `hidden`: under a mustache. */
  mouth: 'smile' | 'grin' | 'flat' | 'smirk' | 'frown' | 'open' | 'small' | 'hidden';
  beard?: 'mustache' | 'stubble' | 'beard';
  extra?: 'earrings' | 'tie' | 'looseTie' | 'collar' | 'phone' | 'watch' | 'pencil';
};

type Ink = { ink: string; detail: string };

const SHOULDERS = 'M20 102 C23 82 36 74 50 74 C64 74 77 82 80 102';
const L = 43;
const R = 57;
const EYE_Y = 48;

/** Hair drawn behind the face (long hair falls past it). */
function hairBack(spec: FaceSpec, { ink }: Ink): ReactNode {
  switch (spec.hair) {
    case 'long':
      return <Path d="M31 46 Q29 23 50 23 Q71 23 69 46 L72 76 Q60 72 66 52 M31 46 L28 76 Q40 72 34 52" fill={ink} fillOpacity={0.1} />;
    case 'bob':
      return <Path d="M31 56 Q28 23 50 23 Q72 23 69 56 Q65 60 61 56 M31 56 Q35 60 39 56" fill={ink} fillOpacity={0.1} />;
    case 'ponytail':
      return <Path d="M65 31 Q80 36 76 58 Q74 66 69 70" strokeWidth={3} />;
    case 'bun':
      return <Circle cx={50} cy={20} r={6.5} fill={ink} fillOpacity={0.18} />;
    default:
      return null;
  }
}

/** Hair on top of the head. */
function hairFront(spec: FaceSpec, { ink, detail }: Ink): ReactNode {
  if (spec.hat && spec.hat !== 'headphones') return null;
  switch (spec.hair) {
    case 'bald':
      return <Path d="M40 31 Q45 28.5 50 29" stroke={detail} strokeWidth={1.3} />;
    case 'buzz':
      return <Path d="M33 40 Q33.5 26 50 26 Q66.5 26 67 40 Q59 33 50 33 Q41 33 33 40 Z" fill={ink} fillOpacity={0.22} strokeWidth={1.6} />;
    case 'short':
      return <Path d="M32.5 43 Q31 24 50 24 Q69 24 67.5 43 Q63 33 50 33.5 Q37 33 32.5 43 Z" fill={ink} fillOpacity={0.2} />;
    case 'spiky':
      return <Path d="M33 41 L34 25 L40 32 L43 19 L49 30 L54 18 L58 30 L64 21 L65 32 L67 41" fill={ink} fillOpacity={0.15} />;
    case 'side':
      return (
        <>
          <Path d="M32.5 43 Q31 24 50 24 Q69 24 67.5 43 Q66 33 58 31 Q46 29 32.5 43 Z" fill={ink} fillOpacity={0.2} />
          <Path d="M41 27 Q50 26 58 31" stroke={detail} strokeWidth={1.2} />
        </>
      );
    case 'messy':
      return (
        <Path
          d="M32.5 43 Q29 30 36 27 Q38 20 45 23 Q49 17 54 22 Q61 19 63 26 Q70 28 67.5 43 Q62 34 55 36 Q50 31 44 35 Q38 33 32.5 43 Z"
          fill={ink}
          fillOpacity={0.2}
        />
      );
    case 'curly':
      return (
        <G fill={ink} fillOpacity={0.18}>
          <Circle cx={35} cy={36} r={5} />
          <Circle cx={39.5} cy={28.5} r={5.5} />
          <Circle cx={47} cy={24.5} r={5.5} />
          <Circle cx={55} cy={24.5} r={5.5} />
          <Circle cx={62} cy={29} r={5.5} />
          <Circle cx={65.5} cy={37} r={5} />
        </G>
      );
    case 'long':
    case 'bob':
      return <Path d="M33 41 Q33 25 50 25 Q67 25 67 41 Q58 35 50 30 Q42 36 33 41 Z" fill={ink} fillOpacity={0.22} />;
    case 'bun':
    case 'ponytail':
      return (
        <>
          <Path d="M33 42 Q32 26 50 26 Q68 26 67 42 Q60 33 50 32 Q40 33 33 42 Z" fill={ink} fillOpacity={0.2} />
          <Path d="M50 26 L50 32" stroke={detail} strokeWidth={1.1} />
        </>
      );
  }
}

function hat(spec: FaceSpec, { ink, detail }: Ink): ReactNode {
  switch (spec.hat) {
    case 'cap':
      return (
        <>
          <Path d="M32 41 Q32 22 50 22 Q68 22 68 41 Z" fill={ink} fillOpacity={0.18} />
          <Path d="M28 42 Q50 50 72 42 Q50 45 28 42 Z" fill={ink} fillOpacity={0.4} />
          <Circle cx={50} cy={23} r={1.5} fill={ink} />
        </>
      );
    case 'capBack':
      return (
        <>
          <Path d="M32 41 Q32 22 50 22 Q68 22 68 41 Z" fill={ink} fillOpacity={0.18} />
          <Path d="M42 40 Q50 37 58 40" stroke={detail} strokeWidth={1.6} />
          <Path d="M68 37 Q77 36 81 40" />
        </>
      );
    case 'beanie':
      return (
        <>
          <Path d="M31.5 42 Q31 20 50 20 Q69 20 68.5 42 Z" fill={ink} fillOpacity={0.16} />
          <Path d="M31 42 L69 42" strokeWidth={3.4} />
          <Path d="M37 25 L36 41 M44 21.5 L44 41 M56 21.5 L56 41 M63 25 L64 41" stroke={detail} strokeWidth={1} strokeDasharray="2 2" />
        </>
      );
    case 'hood':
      return (
        <>
          <Path d="M25 78 Q20 30 50 20 Q80 30 75 78" />
          <Path d="M32 62 Q29 32 50 27 Q71 32 68 62" stroke={detail} strokeWidth={1.3} />
        </>
      );
    case 'headphones':
      return (
        <>
          <Path d="M30 47 Q29 19 50 19 Q71 19 70 47" strokeWidth={3} />
          <Rect x={25} y={41} width={8} height={14} rx={3} fill={ink} fillOpacity={0.4} />
          <Rect x={67} y={41} width={8} height={14} rx={3} fill={ink} fillOpacity={0.4} />
        </>
      );
    default:
      return null;
  }
}

function eyes(spec: FaceSpec, { ink, detail }: Ink): ReactNode {
  const dot = (cx: number, r = 1.8) => <Circle cx={cx} cy={EYE_Y} r={r} fill={detail} stroke="none" />;
  switch (spec.eyes) {
    case 'dots':
      return (
        <>
          {dot(L)}
          {dot(R)}
        </>
      );
    case 'wide':
      return (
        <>
          <Circle cx={L} cy={EYE_Y} r={3.6} />
          <Circle cx={R} cy={EYE_Y} r={3.6} />
          {dot(L + 0.4, 1.3)}
          {dot(R + 0.4, 1.3)}
        </>
      );
    case 'narrow':
      return <Path d={`M${L - 3.5} ${EYE_Y} L${L + 3.5} ${EYE_Y - 0.6} M${R - 3.5} ${EYE_Y - 0.6} L${R + 3.5} ${EYE_Y}`} stroke={detail} strokeWidth={1.9} />;
    case 'sleepy':
      return (
        <>
          <Path d={`M${L - 3.5} ${EYE_Y - 0.5} L${L + 3.5} ${EYE_Y - 0.5} M${R - 3.5} ${EYE_Y - 0.5} L${R + 3.5} ${EYE_Y - 0.5}`} />
          <Path d={`M${L - 3} ${EYE_Y - 0.5} Q${L} ${EYE_Y + 3} ${L + 3} ${EYE_Y - 0.5} M${R - 3} ${EYE_Y - 0.5} Q${R} ${EYE_Y + 3} ${R + 3} ${EYE_Y - 0.5}`} stroke={detail} strokeWidth={1.4} />
        </>
      );
    case 'glasses':
      return (
        <>
          <Circle cx={L} cy={EYE_Y} r={4.8} />
          <Circle cx={R} cy={EYE_Y} r={4.8} />
          <Path d={`M${L + 4.8} ${EYE_Y} Q50 ${EYE_Y - 1.8} ${R - 4.8} ${EYE_Y}`} />
          {dot(L, 1.4)}
          {dot(R, 1.4)}
        </>
      );
    case 'squareGlasses':
      return (
        <>
          <Rect x={L - 5} y={EYE_Y - 3.8} width={10} height={7.6} rx={1.5} />
          <Rect x={R - 5} y={EYE_Y - 3.8} width={10} height={7.6} rx={1.5} />
          <Line x1={L + 5} y1={EYE_Y - 1} x2={R - 5} y2={EYE_Y - 1} />
          {dot(L, 1.4)}
          {dot(R, 1.4)}
        </>
      );
    case 'shades':
      return (
        <>
          <Rect x={L - 5.5} y={EYE_Y - 3.5} width={11} height={7} rx={3} fill={ink} fillOpacity={0.75} />
          <Rect x={R - 5.5} y={EYE_Y - 3.5} width={11} height={7} rx={3} fill={ink} fillOpacity={0.75} />
          <Line x1={L + 5.5} y1={EYE_Y - 1.5} x2={R - 5.5} y2={EYE_Y - 1.5} />
        </>
      );
  }
}

function brows(spec: FaceSpec, { detail }: Ink): ReactNode {
  const y = EYE_Y - 6;
  const paths: Record<NonNullable<FaceSpec['brows']>, string> = {
    flat: `M${L - 4} ${y} L${L + 4} ${y} M${R - 4} ${y} L${R + 4} ${y}`,
    angry: `M${L - 4} ${y - 1.5} L${L + 4} ${y + 1} M${R - 4} ${y + 1} L${R + 4} ${y - 1.5}`,
    worried: `M${L - 4} ${y + 1} L${L + 4} ${y - 1.5} M${R - 4} ${y - 1.5} L${R + 4} ${y + 1}`,
    raised: `M${L - 4} ${y} L${L + 4} ${y} M${R - 4} ${y - 1} Q${R} ${y - 4.5} ${R + 4} ${y - 1}`,
  };
  return spec.brows ? <Path d={paths[spec.brows]} stroke={detail} strokeWidth={1.6} /> : null;
}

function mouth(spec: FaceSpec, { ink, detail }: Ink): ReactNode {
  switch (spec.mouth) {
    case 'smile':
      return <Path d="M43.5 57.5 Q50 62.5 56.5 57.5" />;
    case 'grin':
      return (
        <>
          <Path d="M42 56 Q50 66 58 56 Z" fill={ink} fillOpacity={0.2} />
          <Path d="M43.5 57.6 L56.5 57.6" stroke={detail} strokeWidth={1.1} />
        </>
      );
    case 'flat':
      return <Path d="M44.5 59 L55.5 59" />;
    case 'smirk':
      return <Path d="M44 59.5 Q51 60.5 57 56.5" />;
    case 'frown':
      return <Path d="M43.5 61 Q50 56 56.5 61" />;
    case 'open':
      return <Ellipse cx={50} cy={59} rx={4} ry={3.2} fill={ink} fillOpacity={0.25} />;
    case 'small':
      return <Path d="M47 59 Q50 60.6 53 59" />;
    case 'hidden':
      return null;
  }
}

function beard(spec: FaceSpec, { ink, detail }: Ink): ReactNode {
  switch (spec.beard) {
    case 'mustache':
      return <Path d="M41.5 55.5 Q46 52.5 50 54.5 Q54 52.5 58.5 55.5 Q54 57 50 55.8 Q46 57 41.5 55.5 Z" fill={ink} fillOpacity={0.7} />;
    case 'stubble':
      return (
        <G fill={detail} stroke="none" opacity={0.7}>
          {[38, 41, 44, 47, 50, 53, 56, 59, 62].map((x, i) => (
            <Circle key={x} cx={x} cy={63 + (i % 2) * 1.6 + Math.abs(50 - x) * -0.08} r={0.6} />
          ))}
        </G>
      );
    case 'beard':
      return <Path d="M33 50 Q34 71 50 71 Q66 71 67 50 Q62 61 50 62 Q38 61 33 50 Z" fill={ink} fillOpacity={0.25} />;
    default:
      return null;
  }
}

function extra(spec: FaceSpec, { ink, detail }: Ink): ReactNode {
  switch (spec.extra) {
    case 'earrings':
      return (
        <>
          <Circle cx={32.5} cy={57} r={1.8} fill={ink} />
          <Circle cx={67.5} cy={57} r={1.8} fill={ink} />
        </>
      );
    case 'tie':
      return <Path d="M47.5 75 L52.5 75 L51.5 79 L54 94 L50 99 L46 94 L48.5 79 Z" fill={ink} fillOpacity={0.35} strokeWidth={1.6} />;
    case 'looseTie':
      return (
        <>
          <Path d="M45 80 L51 79 L50 83 L55 96 L51 100 L47 95 L47.5 83 Z" fill={ink} fillOpacity={0.35} strokeWidth={1.6} />
          <Path d="M43 75 L47 81 M57 75 L53 80" stroke={detail} strokeWidth={1.4} />
        </>
      );
    case 'collar':
      return <Path d="M42 74 L46 81 L50 76 L54 81 L58 74" stroke={detail} strokeWidth={1.6} />;
    case 'phone':
      return (
        <>
          <Rect x={64} y={40} width={8} height={16} rx={2} fill={ink} fillOpacity={0.35} transform="rotate(12 68 48)" />
          <Path d="M70 60 Q76 66 74 76" stroke={detail} strokeWidth={1.6} />
        </>
      );
    case 'watch':
      return (
        <>
          <Circle cx={73} cy={86} r={7} fill={ink} fillOpacity={0.15} />
          <Path d="M73 86 L73 81.5 M73 86 L76.5 87.5" stroke={detail} strokeWidth={1.5} />
        </>
      );
    case 'pencil':
      return <Path d="M64 29 L74 41 L75.5 44 L72.5 42.5 Z" fill={ink} fillOpacity={0.3} strokeWidth={1.6} />;
    default:
      return null;
  }
}

/** Draws the face inside BotPortrait's 100×100 frame. */
export function FaceDrawing({ spec, ink, detail }: { spec: FaceSpec } & Ink) {
  const c = { ink, detail };
  const showEars = !spec.hat || spec.hat === 'cap' || spec.hat === 'capBack' || spec.hat === 'beanie';
  return (
    <>
      <Path d={SHOULDERS} />
      {hairBack(spec, c)}
      <Path d="M45 66 L45 74 M55 66 L55 74" stroke={detail} strokeWidth={1.4} />
      <Ellipse cx={50} cy={48} rx={17} ry={20} />
      {showEars ? <Path d="M33 44 Q29 48 33 53 M67 44 Q71 48 67 53" /> : null}
      {hairFront(spec, c)}
      {hat(spec, c)}
      {brows(spec, c)}
      {eyes(spec, c)}
      {beard(spec, c)}
      {mouth(spec, c)}
      {extra(spec, c)}
    </>
  );
}
