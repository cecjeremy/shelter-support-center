import { config } from '../config';

export function getAWSAccounts(): { id: string; region: string; profile: string; branch: string }[] {
  const accountIds = [];
  for (const branch of Object.keys(config.accounts)) {
    const { id, region, profile } = config.accounts[branch];
    if (!(id && region && profile)) {
      throw new Error(
        'missing account id/region/profile in config file. Make sure all config files have valid account id filled out'
      );
    }
    accountIds.push({ id, region, profile, branch });
  }
  return accountIds;
}
