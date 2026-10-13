import type { TFunction } from 'i18next';

import { botsInLeague } from '@/bots/catalog';
import type { Unlock } from '@/looks/catalog';

/** How to open a locked item, in words: "Beat 3 bots in the Regulars league", "Comes with Pro". */
export function unlockText(unlock: Unlock, t: TFunction): string {
  switch (unlock.kind) {
    case 'free':
      return '';
    case 'pro':
      return t('looks.unlock.pro');
    case 'bot':
      return t('looks.unlock.bot', { name: t(`bots.list.${unlock.botId}.name`) });
    case 'league': {
      const league = t(`bots.leagues.${unlock.league}`);
      return unlock.count >= botsInLeague(unlock.league).length
        ? t('looks.unlock.leagueAll', { league })
        : t('looks.unlock.league', { count: unlock.count, league });
    }
  }
}
