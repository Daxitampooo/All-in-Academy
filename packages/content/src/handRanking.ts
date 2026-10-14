/**
 * Hand categories from best to worst, with an example and the chance to hold it by the river with seven
 * cards (all 133,784,560 seven-card hands counted). Names come from the app's locale (handNames.*).
 */
export const HAND_RANKING: { id: string; example: string; percent: number }[] = [
  { id: 'royal-flush', example: 'Ah Kh Qh Jh Th', percent: 0.0032 },
  { id: 'straight-flush', example: '9s 8s 7s 6s 5s', percent: 0.0279 },
  { id: 'quads', example: 'Qc Qd Qh Qs 7d', percent: 0.168 },
  { id: 'full-house', example: 'Kc Kd Ks 4h 4c', percent: 2.6 },
  { id: 'flush', example: 'Ad Jd 8d 5d 2d', percent: 3.03 },
  { id: 'straight', example: 'Tc 9d 8h 7s 6c', percent: 4.62 },
  { id: 'trips', example: '8c 8d 8s Kh 3d', percent: 4.83 },
  { id: 'two-pair', example: 'Jc Jd 5h 5s Ac', percent: 23.5 },
  { id: 'pair', example: 'Th Tc Ad 7s 3h', percent: 43.8 },
  { id: 'high-card', example: 'Ac Qd 9h 6s 3c', percent: 17.4 },
];
