import { Connect } from '@aws-sdk/client-connect';

export async function getConnectInstanceId(alias: string) {
  const connect = new Connect({ region: process.env.AWS_REGION });

  // eslint-disable-next-line prefer-const
  let NextToken: undefined | string;
  do {
    // eslint-disable-next-line no-await-in-loop
    const { InstanceSummaryList = [], NextToken: newToken } = await connect.listInstances({ NextToken });
    NextToken = newToken;
    for (const { Id, InstanceAlias } of InstanceSummaryList) {
      if (InstanceAlias === alias) {
        return Id;
      }
    }
  } while (NextToken);
}

if (require.main === module) {
  getConnectInstanceId(process.argv[2]).then(id => {
    // eslint-disable-next-line no-console
    console.log(id);
  });
}
