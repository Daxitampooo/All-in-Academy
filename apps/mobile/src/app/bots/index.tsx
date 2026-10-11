import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { BotPortrait } from '@/components/BotPortrait';
import { CheckIcon, LockIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import {
  LEAGUES,
  WINS_TO_UNLOCK,
  beatenCount,
  botIsReady,
  botsInLeague,
  leagueAfter,
  leagueUnlocked,
  type BotEntry,
  type League,
} from '@/bots/catalog';
import { beatenById, useBotProgress } from '@/store/botProgress';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function BotsScreen() {
  const { t } = useTranslation();
  const records = useBotProgress((s) => s.records);
  const wins = beatenById(records);

  return (
    <Screen
      title={t('bots.title')}
      subtitle={t('bots.subtitle')}
      header={<BackButton label={t('bots.back')} fallback="/" />}>
      {LEAGUES.map((league) => (
        <LeagueSection key={league.id} league={league} wins={wins} />
      ))}
    </Screen>
  );
}

function LeagueSection({ league, wins }: { league: League; wins: Record<string, number> }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const unlocked = leagueUnlocked(league.id, wins);
  const bots = botsInLeague(league.id);
  const next = leagueAfter(league.id);
  const beaten = beatenCount(league.id, wins);
  const previous = LEAGUES[LEAGUES.findIndex((l) => l.id === league.id) - 1];

  let status: string | null = null;
  if (!unlocked) {
    status =
      league.id === 'secret'
        ? t('bots.secretRule')
        : t('bots.lockedRule', { league: t(`bots.leagues.${previous!.id}`) });
  } else if (next && beaten < WINS_TO_UNLOCK) {
    status = t('bots.progress', { count: beaten, need: WINS_TO_UNLOCK, league: t(`bots.leagues.${next}`) });
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitle}>
          <AppText variant="title" tone={unlocked ? 'text' : 'muted'}>
            {t(`bots.leagues.${league.id}`)}
          </AppText>
          {!unlocked ? <LockIcon color={colors.textMuted} size={18} /> : null}
        </View>
        {league.range ? (
          <AppText variant="caption" tone="muted" numeric>
            {t('bots.range', { from: league.range[0], to: league.range[1] })}
          </AppText>
        ) : null}
        {status ? (
          <AppText variant="label" tone={unlocked ? 'lime' : 'muted'}>
            {status}
          </AppText>
        ) : null}
      </View>
      <View style={styles.grid}>
        {bots.map((bot) => (
          <BotTile key={bot.id} bot={bot} unlocked={unlocked} beaten={(wins[bot.id] ?? 0) > 0} secret={league.id === 'secret'} />
        ))}
      </View>
    </View>
  );
}

function BotTile({ bot, unlocked, beaten, secret }: { bot: BotEntry; unlocked: boolean; beaten: boolean; secret: boolean }) {
  const { t } = useTranslation();
  const { colors, hues } = useTheme();
  const ready = botIsReady(bot.id);
  const hidden = secret && !unlocked;
  const name = hidden ? '???' : t(`bots.list.${bot.id}.short`);
  const rating = bot.rating === null || hidden ? t('bots.hiddenRating') : String(bot.rating);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/bots/[id]', params: { id: bot.id } })}
      disabled={hidden}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${rating}`}
      style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.surface }]}>
      <View>
        <BotPortrait kind={hidden ? 'unknown' : bot.portrait} color={hues[bot.hue]} size={76} muted={!unlocked || !ready} />
        {beaten ? (
          <View style={[styles.beaten, { backgroundColor: colors.lime, borderColor: colors.bg }]}>
            <CheckIcon color={colors.onAccent} size={12} />
          </View>
        ) : null}
      </View>
      <AppText variant="label" strong numberOfLines={2} style={styles.tileName} tone={unlocked ? 'text' : 'muted'}>
        {name}
      </AppText>
      <AppText variant="caption" tone="muted" numeric>
        {rating}
      </AppText>
      {!ready && !hidden ? (
        <AppText variant="caption" tone="muted" style={styles.soon}>
          {t('bots.soon')}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.md,
    marginTop: space.md,
  },
  sectionHeader: {
    gap: space.xxs,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space.md,
    justifyContent: 'flex-start',
  },
  tile: {
    width: '33.33%',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.xxs,
    borderRadius: radius.md,
  },
  tileName: {
    textAlign: 'center',
  },
  soon: {
    marginTop: -space.xxs,
    opacity: 0.8,
  },
  beaten: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
