import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('notFound.title')}>
      <Link href="/" replace>
        <AppText tone="cyan" strong>
          {t('notFound.action')}
        </AppText>
      </Link>
    </Screen>
  );
}
