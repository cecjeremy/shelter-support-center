import { Callback, ConnectContactFlowEvent, Context } from 'aws-lambda';

import logger from '../../services/logger';

export class SecondsToMinutesConverter {
  public handler(event: ConnectContactFlowEvent, _ctx: Context, cb: Callback) {
    logger.info(event);
    try {
      let seconds = parseInt(event.Details.Parameters.seconds);
      seconds = isNaN(seconds) || seconds === 0 ? 1 : seconds;
      const result = { minutes: Math.ceil(seconds / 60), humanReadableMinutes: '' };
      result.humanReadableMinutes = result.minutes <= 1 ? '1 minute' : `${result.minutes} minutes`;
      logger.info(result);
      cb(null, result);
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }
}
