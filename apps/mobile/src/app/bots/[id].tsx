import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Badge } from '@/components/Badge';
import { BotPortrait } from '@/components/BotPortrait';
import { Button } from '@/components/Button';
import { EyeIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { LEAGUES, SERIES_TARGET, botById, botIsReady, leagueUnlocked } from '@/bots/catalog';
import { beatenById, useBotProgress } from '@/store/botProgress';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function BotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { colors, hues } = useTheme();
  const records = useBotProgress((s) => s.records);
  const bot = botById(id ?? '');

  if (!bot) {
    return (
      <Screen header={<BackButton label={t('bots.back')} fallback="/bots" />} title={t('notFound.title')}>
        {null}
      </Screen>
    );
  }

  const color = hues[bot.hue];
  const unlocked = leagueUnlocked(bot.league, beatenById(records));
  const ready = botIsReady(bot.id);
  const record = records[bot.id];
  const greet = ready ? (t(`bots.phrases.${bot.id}.greet`, { returnObjects: true }) as string[])[0] : null;
  const previous = LEAGUES[LEAGUES.findIndex((l) => l.id === bot.league) - 1];
  const target = SERIES_TARGET[bot.league];
  const name = t(`bots.list.${bot.id}.name`);
  // The nickname gives away how the bot plays, so it opens only once the bot is beaten.
  const nicknameKey = `bots.list.${bot.id}.nickname`;
  const nickname = i18n.exists(nicknameKey) ? t(nicknameKey) : null;
  const beaten = (record?.beaten ?? 0) > 0;

  let blocked: string | null = null;
  if (!unlocked) {
    blocked = bot.league === 'secret' ? t('bots.secretRule') : t('bots.lockedBot', { league: t(`bots.leagues.${bot.league}`) });
    if (previous && bot.league !== 'secret') blocked = t('bots.lockedRule', { league: t(`bots.leagues.${previous.id}`) });
  } else if (!ready) {
    blocked = t('bots.notReady');
  }

  return (
    <Screen header={<BackButton label={t('bots.title')} fallback="/bots" />}>
      <View style={styles.hero}>
        <BotPortrait kind={bot.portrait} color={color} size={156} active={unlocked && ready} muted={!unlocked} />
        <AppText variant="title" style={styles.center} accessibilityRole="header">
          {nickname && beaten ? t('bots.withNickname', { name, nickname }) : name}
        </AppText>
        <View style={styles.badges}>
          <Badge label={t(`bots.leagues.${bot.league}`)} tone="cyan" />
          <Badge
            label={bot.rating === null ? t('bots.hiddenRating') : t('bots.rating', { rating: bot.rating })}
            tone="amber"
          />
        </View>
        {bot.cheater ? (
          <View style={styles.cheater}>
            <EyeIcon color={colors.magenta} />
            <AppText variant="label" tone="magenta">
              {t('bots.cheater')}
            </AppText>
          </View>
        ) : null}
      </View>

      {greet ? <SpeechBubble text={greet} color={color} tail="up" style={styles.bubble} /> : null}

      <AppText variant="label" tone="muted" style={styles.center}>
        {record ? t('bots.record', { wins: record.wins, losses: record.losses }) : t('bots.noRecord')}
      </AppText>
      <View style={styles.rules}>
        <AppText variant="label" tone="cyan" style={styles.center}>
          {target > 1 ? t('bots.seriesRule', { target }) : t('bots.seriesRuleOne')}
        </AppText>
        {record && target > 1 && record.series.wins + record.series.losses > 0 ? (
          <AppText variant="label" style={styles.center}>
            {t('bots.seriesNow', record.series)}
          </AppText>
        ) : null}
        {record && record.beaten > 0 ? (
          <AppText variant="label" tone="lime" style={styles.center}>
            {t('bots.beatenTimes', { count: record.beaten })}
          </AppText>
        ) : nickname ? (
          <AppText variant="caption" tone="muted" style={styles.center}>
            {t('bots.nicknameHint')}
          </AppText>
        ) : null}
      </View>

      {blocked ? (
        <AppText variant="label" tone="amber" style={styles.center}>
          {blocked}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={t('bots.playHeadsUp')}
          hint={t('bots.playHeadsUpHint')}
          disabled={!!blocked}
          onPress={() => router.push({ pathname: '/table', params: { mode: 'hu', bot: bot.id } })}
        />
        <Button
          kind="secondary"
          label={t('bots.playTable')}
          hint={t('bots.playTableHint')}
          disabled={!!blocked}
          onPress={() => router.push({ pathname: '/table', params: { mode: 'six', league: bot.league } })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
  },
  center: {
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
  },
  cheater: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  bubble: {
    alignSelf: 'center',
    marginTop: space.xs,
  },
  actions: {
    gap: space.md,
    marginTop: space.sm,
  },
  rules: {
    gap: space.xs,
  },
});
