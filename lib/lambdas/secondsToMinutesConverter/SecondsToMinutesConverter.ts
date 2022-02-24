import { ConnectContactFlowEvent } from 'aws-lambda';

import logger from '../../services/logger';

export class SecondsToMinutesConverter {
  public handler(event: ConnectContactFlowEvent) {
    logger.info(event);

    // if the oldest contact in the queue doesn't exist the
    // input seconds could potentially be null/undefined
    // so this ternary will default to always reporting at
    // least 1 minute of wait time.
    const seconds = event.Details.Parameters.seconds ?? 1;

    try {
      const result = { minutes: Math.ceil(parseInt(seconds) / 60) };
      logger.info(result);
      return result;
    } catch (err) {
      logger.error({ err });
      throw err;
    }
  }
}
