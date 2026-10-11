import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { BookIcon, PersonIcon, SpadeIcon, TargetIcon } from '@/components/icons';
import { TabBar, TabButton } from '@/components/TabBar';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs style={[styles.root, { backgroundColor: colors.bg }]}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="play" href="/" asChild>
            <TabButton label={t('tabs.play')} Icon={SpadeIcon} />
          </TabTrigger>
          <TabTrigger name="academy" href="/academy" asChild>
            <TabButton label={t('tabs.academy')} Icon={BookIcon} />
          </TabTrigger>
          <TabTrigger name="train" href="/train" asChild>
            <TabButton label={t('tabs.train')} Icon={TargetIcon} />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton label={t('tabs.profile')} Icon={PersonIcon} />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1 },
});
