import { Callback, ConnectContactFlowEvent, ConnectContactFlowHandler, Context } from 'aws-lambda';

import { SecondsToMinutesConverter } from './SecondsToMinutesConverter';

const lambda = new SecondsToMinutesConverter();

export const handler: ConnectContactFlowHandler = (
  event: ConnectContactFlowEvent,
  context: Context,
  callback: Callback
) => {
  return lambda.handler(event, context, callback);
};
