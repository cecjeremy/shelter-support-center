import { ConnectContactFlowEvent } from 'aws-lambda';

import { SecondsToMinutesConverter } from './SecondsToMinutesConverter';

const lambda = new SecondsToMinutesConverter();

export const handler = (event: ConnectContactFlowEvent) => {
  return lambda.handler(event);
};
