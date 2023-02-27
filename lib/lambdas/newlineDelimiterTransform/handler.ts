import {
  FirehoseTransformationEvent,
  FirehoseTransformationHandler,
  FirehoseTransformationCallback,
  FirehoseTransformationResultRecord,
  Context
} from 'aws-lambda';
import { Logger } from '@voicefoundry-cloud/vf-logger';

const logger = new Logger();

export const handler: FirehoseTransformationHandler = (
  event: FirehoseTransformationEvent,
  _: Context,
  callback: FirehoseTransformationCallback
) => {
  logger.info('processing trace records');

  const records: FirehoseTransformationResultRecord[] = [];
  logger.debug(event.records);
  if (event.records) {
    event.records.forEach(record => {
      const input = Buffer.from(record.data, 'base64').toString('utf8');
      const output = Buffer.from(`${input}\n`, 'utf8').toString('base64');
      logger.info('processed record', input);
      records.push({
        ...record,
        data: output,
        result: 'Ok'
      });
    });
  }

  callback(null, { records });
};
