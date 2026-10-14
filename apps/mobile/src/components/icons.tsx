import Svg, { Circle, Path } from 'react-native-svg';

export type IconProps = {
  color: string;
  size?: number;
  /** Filled variant for the selected tab. */
  filled?: boolean;
};

const stroke = { strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function SpadeIcon({ color, size = 24, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.8c-2.7 3.4-7.6 6.3-7.6 10.3 0 2.4 1.9 4.2 4.2 4.2 1.2 0 2.2-.5 2.7-1.2-.2 1.9-1 3.4-2.5 4.6h6.4c-1.5-1.2-2.3-2.7-2.5-4.6.5.7 1.5 1.2 2.7 1.2 2.3 0 4.2-1.8 4.2-4.2 0-4-4.9-6.9-7.6-10.3z"
        stroke={color}
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.22 : 0}
        {...stroke}
      />
    </Svg>
  );
}

export function BookIcon({ color, size = 24, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 5.6c2.6-1.1 5.6-1 9 .9 3.4-1.9 6.4-2 9-.9v13c-2.6-1.1-5.6-1-9 .9-3.4-1.9-6.4-2-9-.9z"
        stroke={color}
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.22 : 0}
        {...stroke}
      />
      <Path d="M12 6.5v13" stroke={color} {...stroke} />
    </Svg>
  );
}

export function TargetIcon({ color, size = 24, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={9}
        stroke={color}
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.18 : 0}
        {...stroke}
      />
      <Circle cx={12} cy={12} r={5} stroke={color} {...stroke} />
      <Circle cx={12} cy={12} r={1.4} fill={color} />
    </Svg>
  );
}

export function PersonIcon({ color, size = 24, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={8}
        r={4}
        stroke={color}
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.22 : 0}
        {...stroke}
      />
      <Path d="M4.5 20c1.4-3.7 4.3-5.7 7.5-5.7s6.1 2 7.5 5.7" stroke={color} {...stroke} />
    </Svg>
  );
}

export function GearIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.2} stroke={color} {...stroke} />
      <Path
        d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"
        stroke={color}
        {...stroke}
      />
    </Svg>
  );
}

export function ChevronLeftIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 5.5 8 12l6.5 6.5" stroke={color} {...stroke} strokeWidth={2.2} />
    </Svg>
  );
}

export function CheckIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m5 12.5 4.5 4.5L19 7.5" stroke={color} {...stroke} strokeWidth={2.4} />
    </Svg>
  );
}

export function LockIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 10.5V8a5 5 0 0 1 10 0v2.5" stroke={color} {...stroke} />
      <Path d="M5.5 10.5h13v9.5h-13z" stroke={color} {...stroke} />
      <Path d="M12 14.5v2" stroke={color} {...stroke} />
    </Svg>
  );
}

export function EyeIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke={color} {...stroke} />
      <Circle cx={12} cy={12} r={3} stroke={color} {...stroke} />
    </Svg>
  );
}

export function CloseIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} {...stroke} strokeWidth={2.2} />
    </Svg>
  );
}

export function ChevronUpIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 14.5 12 8l6.5 6.5" stroke={color} {...stroke} strokeWidth={2.2} />
    </Svg>
  );
}

export function ChevronDownIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 9.5 12 16l6.5-6.5" stroke={color} {...stroke} strokeWidth={2.2} />
    </Svg>
  );
}

export function ChartIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5h16" stroke={color} {...stroke} />
      <Path d="m5 15 4.5-5 3.5 3 6-7" stroke={color} {...stroke} />
    </Svg>
  );
}

/** Replayer controls: to the start, one step back, one step forward, to the end. */
export function StepIcon({ color, size = 22, kind }: IconProps & { kind: 'first' | 'prev' | 'next' | 'last' }) {
  const flip = kind === 'first' || kind === 'prev';
  const bar = kind === 'first' || kind === 'last';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Path d={bar ? 'M6 6.5 13.5 12 6 17.5Z' : 'M8 6.5 15.5 12 8 17.5Z'} fill={color} stroke={color} {...stroke} />
      {bar ? <Path d="M17.5 6.5v11" stroke={color} {...stroke} strokeWidth={2.4} /> : null}
    </Svg>
  );
}

export function FlagIcon({ color, size = 18, filled }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 21V4" stroke={color} {...stroke} strokeWidth={2} />
      <Path d="M6 4.5h11l-2.5 4 2.5 4H6" stroke={color} fill={filled ? color : 'none'} {...stroke} />
    </Svg>
  );
}

export function ListIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6.5h11M9 12h11M9 17.5h11" stroke={color} {...stroke} />
      <Circle cx={4.5} cy={6.5} r={1.2} fill={color} />
      <Circle cx={4.5} cy={12} r={1.2} fill={color} />
      <Circle cx={4.5} cy={17.5} r={1.2} fill={color} />
    </Svg>
  );
}

export function StarIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.6l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8Z" stroke={color} {...stroke} />
    </Svg>
  );
}
