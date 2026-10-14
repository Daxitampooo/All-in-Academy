import { describeHand, legalActions, potSize, type Card, type HandEvent, type HandState } from '@pokerall/poker-engine';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LEAGUES, botById, botIsReady, leagueUnlocked, seriesTarget, type LeagueId } from '@/bots/catalog';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { CloseIcon } from '@/components/icons';
import { SpeechBubble, type TailSide } from '@/components/SpeechBubble';
import { ACTION_AREA_HEIGHT, ActionBar } from '@/components/table/ActionBar';
import { BetChip } from '@/components/table/BetChip';
import { DealtCard } from '@/components/table/DealtCard';
import type { CardSize } from '@/components/table/PlayingCard';
import { BotSeat, HeroSeat, type SeatStatus } from '@/components/table/Seat';
import { RoomBackdrop } from '@/components/table/RoomBackdrop';
import { TableFelt } from '@/components/table/TableFelt';
import { TrainingReveal } from '@/components/table/TrainingReveal';
import { formatChips } from '@/lib/format';
import { LookScope, usePersonalLook, useTableLook } from '@/looks/LookProvider';
import { beatenById, useBotProgress, type SeriesUpdate } from '@/store/botProgress';
import { useMatchReview } from '@/store/matchReview';
import { useProfile } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { handNameKey, handOutcome, seatName as nameOfSeat, splitNote } from '@/table/describe';
import { useTableGame, type MatchResult, type SeatInfo, type TableMode } from '@/table/useTableGame';
import { useTheme } from '@/theme/ThemeProvider';
import { maxContentWidth, radius, space, withAlpha } from '@/theme/tokens';

const HERO = 0;

export default function TableScreen() {
  const params = useLocalSearchParams<{ mode?: string; bot?: string; league?: string; r?: string }>();
  const { t } = useTranslation();
  const beaten = beatenById(useBotProgress((s) => s.records));
  const look = usePersonalLook();

  let mode: TableMode | null = null;
  const bot = params.bot ? botById(params.bot) : undefined;
  if (params.mode === 'hu' && bot && botIsReady(bot.id) && leagueUnlocked(bot.league, beaten)) {
    mode = { kind: 'hu', botId: bot.id };
  } else if (params.mode === 'six' && LEAGUES.some((l) => l.id === params.league)) {
    const league = params.league as LeagueId;
    if (leagueUnlocked(league, beaten)) mode = { kind: 'six', league };
  }

  if (!mode) {
    return (
      <View style={styles.center}>
        <AppText>{t('table.unavailable')}</AppText>
        <Button label={t('table.toBots')} onPress={() => router.replace('/bots')} />
      </View>
    );
  }
  // The player's own table look; ranked play and tournaments will use the official one instead.
  return (
    <LookScope look={look}>
      <TableGameView key={params.r ?? 'first'} mode={mode} params={params} />
    </LookScope>
  );
}

type Point = { x: number; y: number };

/** Where a bot's chat bubble goes: beside the portrait, or under it (over the bot's own name and cards). */
type BubbleSide = 'right' | 'left' | 'below-start' | 'below-end';

type BotSpot = Point & {
  /** Center of the bot's chips for the current street. */
  bet: Point;
  textSide: 'below' | 'left';
  bubble: BubbleSide;
};

/** Seat geometry as fractions of the table area; a bot spot is the center of its portrait. */
type TableLayout = {
  portrait: number;
  cardSize: CardSize;
  seatWidth: number;
  /** Seats 1… clockwise from the hero, who sits at the bottom. */
  bots: BotSpot[];
  heroBet: Point;
  /** Vertical center of the board. */
  boardY: number;
};

const HEADS_UP: TableLayout = {
  portrait: 60,
  cardSize: 'md',
  seatWidth: 120,
  bots: [{ x: 0.5, y: 0.09, bet: { x: 0.5, y: 0.335 }, textSide: 'left', bubble: 'right' }],
  heroBet: { x: 0.5, y: 0.66 },
  boardY: 0.48,
};

const SIX_MAX: TableLayout = {
  portrait: 48,
  cardSize: 'sm',
  seatWidth: 110,
  bots: [
    { x: 0.13, y: 0.6, bet: { x: 0.37, y: 0.6 }, textSide: 'below', bubble: 'below-start' },
    { x: 0.13, y: 0.26, bet: { x: 0.37, y: 0.26 }, textSide: 'below', bubble: 'below-start' },
    { x: 0.5, y: 0.075, bet: { x: 0.5, y: 0.315 }, textSide: 'left', bubble: 'right' },
    { x: 0.87, y: 0.26, bet: { x: 0.63, y: 0.26 }, textSide: 'below', bubble: 'below-end' },
    { x: 0.87, y: 0.6, bet: { x: 0.63, y: 0.6 }, textSide: 'below', bubble: 'below-end' },
  ],
  heroBet: { x: 0.5, y: 0.68 },
  boardY: 0.485,
};

const BOARD_CARD_HEIGHT = 59;
/** The flop is dealt one card after another. */
const FLOP_CARD_GAP = 160;

/** The last action of every seat on the current street. */
function streetActions(hand: HandState): Map<number, Extract<HandEvent, { type: 'action' }>> {
  const map = new Map<number, Extract<HandEvent, { type: 'action' }>>();
  for (const e of hand.events) {
    if (e.type === 'street') map.clear();
    if (e.type === 'action') map.set(e.seat, e);
  }
  return map;
}

/** Absolute position and tail of a bot's chat bubble inside a table area of size w×h. */
function bubblePlacement(
  spot: BotSpot,
  portrait: number,
  w: number,
  h: number,
): { style: ViewStyle; tail: TailSide; tailAt: number; tailFromEnd?: boolean } {
  const px = spot.x * w;
  const py = spot.y * h;
  const gap = 10;
  switch (spot.bubble) {
    case 'right': {
      const left = px + portrait / 2 + gap;
      return { style: { left, top: py - 18, maxWidth: Math.min(180, w - 8 - left) }, tail: 'left', tailAt: 18 };
    }
    case 'left': {
      const right = w - (px - portrait / 2 - gap);
      return { style: { right, top: py - 18, maxWidth: Math.min(180, w - 8 - right) }, tail: 'right', tailAt: 18 };
    }
    case 'below-start':
      return { style: { left: 6, top: py + portrait / 2 + 6, maxWidth: 150 }, tail: 'up', tailAt: px - 6 };
    case 'below-end':
      return { style: { right: 6, top: py + portrait / 2 + 6, maxWidth: 150 }, tail: 'up', tailAt: w - 6 - px, tailFromEnd: true };
  }
}

function TableGameView({ mode, params }: { mode: TableMode; params: Record<string, string | undefined> }) {
  const { t, i18n } = useTranslation();
  const { colors, hues } = useTheme();
  const tableLook = useTableLook();
  const nickname = useProfile((s) => s.nickname);
  const avatar = useProfile((s) => s.avatar);
  const titleId = useProfile((s) => s.title);
  const showTitle = useProfile((s) => s.showTitle);
  const insets = useSafeAreaInsets();
  const recordMatch = useBotProgress((s) => s.recordMatch);
  const records = useBotProgress((s) => s.records);
  const haptics = useSettings((s) => s.haptics);
  const sizingOpen = useSettings((s) => s.sizingOpen);
  const showReview = useMatchReview((s) => s.show);
  const [beatenAtStart] = useState(() => beatenById(useBotProgress.getState().records));
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [confirmExit, setConfirmExit] = useState(false);
  const [series, setSeries] = useState<SeriesUpdate | null>(null);

  const game = useTableGame(mode, (r: MatchResult) => {
    if (mode.kind !== 'hu') return;
    setSeries(recordMatch(mode.botId, r.heroWon, seriesTarget(botById(mode.botId)!)));
  });
  const { hand, seats, status, settled } = game;
  const matchRunning = status !== 'match-over' && game.result === null;

  // The Android back button asks before leaving a match in progress.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!matchRunning) return false;
      setConfirmExit(true);
      return true;
    });
    return () => sub.remove();
  }, [matchRunning]);

  // A short buzz when it's your turn and when you win a pot.
  const heroWon = settled ? settled.won[HERO]! > 0 : false;
  useEffect(() => {
    if (haptics && game.heroTurn) Haptics.selectionAsync().catch(() => {});
  }, [game.heroTurn, haptics]);
  useEffect(() => {
    if (haptics && heroWon) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [heroWon, haptics]);

  const layout = mode.kind === 'hu' ? HEADS_UP : SIX_MAX;
  const seatName = (info: SeatInfo) => nameOfSeat(info, t);
  const seatColor = (info: SeatInfo) => (info.kind === 'hero' ? colors.cyan : hues[botById(info.botId)!.hue]);

  const { showdown, actions } = useMemo(() => {
    const shown = new Map<number, Extract<HandEvent, { type: 'showdown' }>>();
    for (const e of hand.events) if (e.type === 'showdown') shown.set(e.seat, e);
    return { showdown: shown, actions: streetActions(hand) };
  }, [hand]);

  const complete = hand.phase === 'complete';
  // While an all-in runout is being opened the hand is over, but the result isn't shown yet.
  const resultShown = complete && settled !== null && settled.hand === hand;
  const won = resultShown ? settled.won : hand.players.map(() => 0);
  // Lights up the hand that won on the board, also when the pot was then split by equity.
  const highlight = useMemo(() => {
    const best = new Set<Card>();
    if (resultShown && showdown.size > 0) {
      hand.players.forEach((p) => {
        if (hand.result!.won[p.seat]! > 0) showdown.get(p.seat)?.bestFive.forEach((c) => best.add(c));
      });
    }
    return best;
  }, [hand, resultShown, showdown]);
  const dimLosers = resultShown && showdown.size > 0;

  const legal = game.heroTurn ? legalActions(hand) : null;
  const hero = hand.players[HERO]!;
  const waitingFor = status === 'acting' && hand.toAct !== null && hand.toAct !== HERO ? hand.toAct : null;
  const title =
    mode.kind === 'hu'
      ? t('table.headsUpTitle', { name: t(`bots.list.${mode.botId}.short`) })
      : t('table.tableTitle', { league: t(`bots.leagues.${mode.league}`) });

  /** Chips in front of a player: before the pots are paid while a runout is opening. */
  const stackOf = (seat: number): number => {
    const p = hand.players[seat]!;
    if (!complete) return p.stack;
    if (resultShown) return settled.stacks[seat]!;
    return p.stack - hand.result!.won[seat]!;
  };

  const statusOf = (seat: number): SeatStatus | null => {
    const p = hand.players[seat]!;
    if (complete) {
      if (!resultShown) return p.allIn ? { text: t('table.allInLabel'), tone: 'allIn' } : null;
      return won[seat]! > 0 ? { text: `+${formatChips(won[seat]!)}`, tone: 'won' } : null;
    }
    if (p.folded) return { text: t('table.folded'), tone: 'folded' };
    if (waitingFor === seat) return { text: t('table.thinking'), tone: 'thinking' };
    const a = actions.get(seat);
    if (a) return a.allIn ? { text: t('table.said.allIn'), tone: 'allIn' } : { text: t(`table.said.${a.action}`), tone: 'action' };
    return p.allIn ? { text: t('table.allInLabel'), tone: 'allIn' } : null;
  };

  const speechText = (seat: number): string | null => {
    const s = game.speech[seat];
    const info = seats[seat]!;
    if (!s || info.kind !== 'bot') return null;
    const lines = t(`bots.phrases.${info.botId}.${s.category}`, { returnObjects: true }) as unknown;
    if (!Array.isArray(lines) || lines.length === 0) return null;
    return String(lines[s.pick % lines.length]);
  };

  // How the hand ended, shown under the board.
  const resultText = resultShown ? handOutcome(settled, seats, HERO, t) : null;
  const resultNote = resultShown ? splitNote(settled, HERO, t) : null;

  const board = hand.board.slice(0, game.boardShown);
  const heroHint =
    !hero.folded && !complete && board.length >= 3
      ? t('table.yourHand', { hand: t(handNameKey(describeHand([...hero.holeCards, ...board]).categoryId, hero.holeCards)) })
      : null;

  const newlyUnlocked = LEAGUES.filter((l) => !leagueUnlocked(l.id, beatenAtStart) && leagueUnlocked(l.id, beatenById(records)));
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/bots'));
  const playAgain = () => router.replace({ pathname: '/table', params: { ...params, r: String(Date.now()) } });
  const openAnalysis = (leaveTable: boolean) => {
    showReview({ mode, seats, hands: game.history, result: game.result, series });
    if (leaveTable) router.replace('/analysis');
    else router.push('/analysis');
  };
  const W = size.w;
  const H = size.h;
  const betSpot = (seat: number) => (seat === HERO ? layout.heroBet : layout.bots[seat - 1]!.bet);
  const bottomPad = Math.max(insets.bottom, space.md);

  // The match result: the series decides whether the bot is beaten.
  const target = mode.kind === 'hu' ? seriesTarget(botById(mode.botId)!) : 1;
  let resultTitle = '';
  let seriesLine: string | null = null;
  if (game.result) {
    const r = game.result;
    if (target === 1 || !series) resultTitle = r.heroWon ? t('table.victoryTitle') : t('table.defeatTitle');
    else if (series.over === 'won') resultTitle = t('table.botBeatenTitle');
    else if (series.over === 'lost') resultTitle = t('table.seriesLostTitle');
    else resultTitle = r.heroWon ? t('table.matchWonTitle') : t('table.defeatTitle');
    if (target > 1 && series) {
      const score = { wins: series.series.wins, losses: series.series.losses };
      if (series.over === 'won') seriesLine = t('table.seriesWon', score);
      else if (series.over === 'lost') seriesLine = t('table.seriesLost', { ...score, name: seatName(seats[1]!) });
      else seriesLine = t('table.seriesScore', { ...score, target });
    }
  }
  // Beating a bot reveals its nickname, which tells how it plays.
  const botBeaten = !!game.result?.heroWon && (target === 1 || series?.over === 'won');
  const nicknameKey = mode.kind === 'hu' ? `bots.list.${mode.botId}.nickname` : '';
  const revealedNickname = botBeaten && i18n.exists(nicknameKey) ? t(nicknameKey) : null;
  // On narrow phones the side seats' cards would touch the board at 6-max, so the board shrinks a little.
  const boardScale = mode.kind === 'six' && W > 0 ? Math.min(1, (W - 2 * (layout.bots[0]!.x * W + 36)) / 226) : 1;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <RoomBackdrop room={tableLook.room} />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (matchRunning ? setConfirmExit(true) : leave())}
          accessibilityRole="button"
          accessibilityLabel={t('table.exit')}
          hitSlop={12}
          style={({ pressed }) => [styles.close, { borderColor: colors.border }, pressed && { opacity: 0.6 }]}>
          <CloseIcon color={colors.text} size={20} />
        </Pressable>
        <AppText variant="heading" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <AppText variant="caption" tone="muted" numeric>
          {t('table.handNumber', { n: game.handNumber })}
        </AppText>
      </View>

      <View style={styles.tableArea} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <TableFelt width={W} height={H} />
        {W > 0 ? (
          <>
            <View
              style={[styles.boardBox, { left: W / 2 - 130, top: layout.boardY * H - BOARD_CARD_HEIGHT / 2 - 26 }]}
              pointerEvents="none">
              <AppText variant="label" strong numeric tone="amber" style={styles.potLabel}>
                {t('table.pot', { amount: formatChips(potSize(hand)) })}
              </AppText>
              <View style={[styles.board, boardScale < 1 && { transform: [{ scale: boardScale }] }]}>
                {Array.from({ length: 5 }, (_, i) => {
                  const c = board[i];
                  if (c === undefined) {
                    return <View key={`slot-${i}`} style={[styles.slot, { borderColor: withAlpha(colors.cyan, 0.18) }]} />;
                  }
                  return (
                    <DealtCard
                      key={`${game.handNumber}-${c}`}
                      card={c}
                      size="md"
                      delay={i < 3 ? i * FLOP_CARD_GAP : 0}
                      highlight={highlight.has(c)}
                      dim={dimLosers && !highlight.has(c)}
                    />
                  );
                })}
              </View>
              {resultText ? (
                <Animated.View
                  entering={FadeInUp.duration(250)}
                  style={[styles.result, { borderColor: withAlpha(colors.lime, 0.6), backgroundColor: withAlpha(colors.bg, 0.85) }]}>
                  <AppText variant="label" strong tone="lime" numeric style={styles.centerText}>
                    {resultText}
                  </AppText>
                  {resultNote ? (
                    <AppText variant="caption" tone="muted" style={styles.centerText}>
                      {resultNote}
                    </AppText>
                  ) : null}
                </Animated.View>
              ) : null}
            </View>

            {hand.players.map((p) => {
              if (p.streetBet === 0 || complete) return null;
              const spot = betSpot(p.seat);
              return (
                <Animated.View
                  key={`bet-${p.seat}`}
                  entering={FadeIn.duration(180)}
                  exiting={FadeOut.duration(180)}
                  style={[styles.betBox, { left: spot.x * W - 60, top: spot.y * H - 13 }]}
                  pointerEvents="none">
                  <BetChip amount={p.streetBet} color={seatColor(seats[p.seat]!)} />
                </Animated.View>
              );
            })}

            {hand.players.map((p) => {
              const info = seats[p.seat]!;
              if (info.kind !== 'bot') return null;
              const spot = layout.bots[p.seat - 1]!;
              const shown = showdown.get(p.seat);
              return (
                <View
                  key={`seat-${p.seat}`}
                  style={[
                    styles.seatBox,
                    { width: layout.seatWidth, left: spot.x * W - layout.seatWidth / 2, top: spot.y * H - layout.portrait / 2 },
                  ]}>
                  <BotSeat
                    name={seatName(info)}
                    color={seatColor(info)}
                    portrait={botById(info.botId)!.portrait}
                    portraitSize={layout.portrait}
                    textSide={spot.textSide}
                    stack={stackOf(p.seat)}
                    folded={p.folded}
                    isTurn={hand.toAct === p.seat && status === 'acting'}
                    isButton={hand.button === p.seat}
                    cards={p.folded ? null : shown ? shown.cards : [null, null]}
                    cardSize={layout.cardSize}
                    highlight={highlight}
                    dimLosers={dimLosers}
                    status={statusOf(p.seat)}
                    dealerLabel={t('table.dealer')}
                  />
                </View>
              );
            })}

            <View style={styles.heroBox}>
              <HeroSeat
                name={nickname ?? t('table.you')}
                title={showTitle && titleId ? t(`achievements.list.${titleId}.name`) : null}
                avatar={avatar}
                stack={stackOf(HERO)}
                cards={hero.holeCards}
                folded={hero.folded}
                isTurn={game.heroTurn}
                isButton={hand.button === HERO}
                highlight={highlight}
                dimLosers={dimLosers}
                status={statusOf(HERO)}
                hint={heroHint}
                dealerLabel={t('table.dealer')}
              />
            </View>

            {hand.players.map((p) => {
              const text = speechText(p.seat);
              if (!text) return null;
              const placement = bubblePlacement(layout.bots[p.seat - 1]!, layout.portrait, W, H);
              return (
                <Animated.View
                  key={`speech-${p.seat}-${game.speech[p.seat]!.key}`}
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  style={[styles.speech, placement.style]}
                  pointerEvents="none">
                  <SpeechBubble
                    text={text}
                    color={seatColor(seats[p.seat]!)}
                    tail={placement.tail}
                    tailAt={placement.tailAt}
                    tailFromEnd={placement.tailFromEnd}
                  />
                </Animated.View>
              );
            })}
          </>
        ) : null}
      </View>

      <View
        style={[
          styles.actionArea,
          {
            // Same height whether or not it's your turn, so the table above never jumps.
            minHeight: ACTION_AREA_HEIGHT[sizingOpen ? 'open' : 'closed'] + space.md + bottomPad,
            paddingBottom: bottomPad,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}>
        {legal ? (
          <ActionBar key={`${game.handNumber}-${hand.events.length}`} hand={hand} legal={legal} heroStack={hero.stack} onAct={game.act} />
        ) : status === 'hand-over' ? (
          <Button label={t('table.next')} kind="secondary" onPress={game.nextHand} />
        ) : status === 'runout' || waitingFor !== null ? (
          <View style={styles.waiting}>
            <AppText tone={status === 'runout' ? 'magenta' : 'muted'} strong={status === 'runout'} style={styles.centerText}>
              {status === 'runout' ? t('table.runout') : t('table.waiting', { name: seatName(seats[waitingFor!]!) })}
            </AppText>
          </View>
        ) : null}
      </View>

      {confirmExit ? (
        <Overlay>
          <AppText variant="title" style={styles.centerText}>
            {mode.kind === 'hu' ? t('table.exitTitle') : t('table.exitTitleSix')}
          </AppText>
          <AppText tone="muted" style={styles.centerText}>
            {mode.kind === 'hu' ? t('table.exitBody') : t('table.exitBodySix')}
          </AppText>
          <Button label={t('table.stay')} onPress={() => setConfirmExit(false)} />
          {game.history.length > 0 ? (
            <Button label={t('table.analysis')} kind="secondary" onPress={() => openAnalysis(true)} />
          ) : null}
          <Button label={t('table.leave')} kind="danger" onPress={leave} />
        </Overlay>
      ) : null}

      {game.result ? (
        <Overlay>
          <AppText variant="display" tone={game.result.heroWon ? 'lime' : 'magenta'} style={styles.centerText}>
            {resultTitle}
          </AppText>
          <AppText style={styles.centerText}>
            {game.result.heroWon
              ? t('table.victoryBody', { hands: game.result.hands })
              : t('table.defeatBody', { name: seatName(seats[1]!), hands: game.result.hands })}
          </AppText>
          {game.result.training ? <TrainingReveal report={game.result.training} bigBlind={hand.config.bigBlind} /> : null}
          {seriesLine ? (
            <AppText variant="label" tone="cyan" style={styles.centerText}>
              {seriesLine}
            </AppText>
          ) : null}
          {revealedNickname ? (
            <AppText variant="heading" tone="lime" style={styles.centerText}>
              {t('table.nicknameRevealed', { nickname: revealedNickname })}
            </AppText>
          ) : null}
          {newlyUnlocked.map((l) => (
            <AppText key={l.id} variant="heading" tone="amber" style={styles.centerText}>
              {t('table.unlocked', { league: t(`bots.leagues.${l.id}`) })}
            </AppText>
          ))}
          <Button label={t('table.playAgain')} onPress={playAgain} />
          <Button label={t('table.analysis')} kind="secondary" onPress={() => openAnalysis(false)} />
          <Button label={t('table.toBots')} kind="secondary" onPress={leave} />
        </Overlay>
      ) : null}

      {status === 'hero-busted' ? (
        <Overlay>
          <AppText variant="title" style={styles.centerText}>
            {t('table.bustedTitle')}
          </AppText>
          <AppText tone="muted" style={styles.centerText}>
            {t('table.bustedBody')}
          </AppText>
          <Button label={t('table.rebuy')} onPress={game.rebuy} />
          <Button label={t('table.analysis')} kind="secondary" onPress={() => openAnalysis(false)} />
          <Button label={t('table.toBots')} kind="secondary" onPress={leave} />
        </Overlay>
      ) : null}
    </View>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: withAlpha(colors.bg, 0.86) }]}>
      <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityViewIsModal>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  tableArea: {
    flex: 1,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  boardBox: {
    position: 'absolute',
    width: 260,
    alignItems: 'center',
  },
  potLabel: {
    height: 18,
    marginBottom: space.sm,
  },
  board: {
    flexDirection: 'row',
    gap: 4,
  },
  slot: {
    width: 42,
    height: BOARD_CARD_HEIGHT,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  result: {
    marginTop: space.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  betBox: {
    position: 'absolute',
    width: 120,
    alignItems: 'center',
  },
  seatBox: {
    position: 'absolute',
    alignItems: 'center',
  },
  heroBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space.sm,
    alignItems: 'center',
  },
  speech: {
    position: 'absolute',
  },
  actionArea: {
    justifyContent: 'flex-end',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  waiting: {
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
  },
});
