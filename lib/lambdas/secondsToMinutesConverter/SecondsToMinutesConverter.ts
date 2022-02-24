import { ConnectContactFlowEvent } from 'aws-lambda';

import logger from '../../services/logger';

export class SecondsToMinutesConverter {
  public handler(event: ConnectContactFlowEvent) {
    logger.info(event);

    const seconds = event.Details.Parameters.seconds;

    try {
      return { minutes: Math.ceil(parseInt(seconds) / 60) };
    } catch (err) {
      logger.error({ err });
      throw err;
    }
  }
}
