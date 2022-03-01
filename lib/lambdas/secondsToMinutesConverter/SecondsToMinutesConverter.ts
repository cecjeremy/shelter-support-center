import { Callback, ConnectContactFlowEvent, Context } from 'aws-lambda';

import logger from '../../services/logger';

export class SecondsToMinutesConverter {
  public handler(event: ConnectContactFlowEvent, ctx: Context, cb: Callback) {
    logger.info(event);

    // if the oldest contact in the queue doesn't exist the
    // input seconds could potentially be null/undefined
    // so this ternary will default to always reporting at
    // least 1 minute of wait time.

    try {
      let seconds = parseInt(event.Details.Parameters.seconds);
      seconds = isNaN(seconds) || seconds === 0 ? 1 : seconds;
      const result = { minutes: Math.ceil(seconds / 60) };
      logger.info(result);
      cb(null, result);
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }
}
