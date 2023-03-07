import { S3CreateEvent } from 'aws-lambda';
import { Logger } from '@voicefoundry-cloud/vf-logger';
import { S3 } from '../../services/s3';
import { IContactTraceRecord } from '../../interfaces/IContactTraceRecord';

const logger = new Logger();

const getObjectNameFromKey = (key: string): string => {
  if (key.length === 0) {
    return '';
  }
  const parts = key.split('/');
  return parts[parts.length - 1];
};
const readableToString = async (readable: any): Promise<string> => {
  let result = '';
  for await (const chunk of readable) {
    result += chunk;
  }
  return result;
};

const replaceAll = (str: string, find: string, replace: string) => {
  return str.replace(new RegExp(find, 'g'), replace);
};

const updateRecordingLocation = (ctr: IContactTraceRecord, bucket: string, newBucket: string): IContactTraceRecord => {
  if (ctr.Recording) {
    if (ctr.Recording.Location) {
      //   logger.info(`Replacing ${bucket} with ${newBucket} in recording location`);
      ctr.Recording.Location = replaceAll(ctr.Recording.Location, bucket, newBucket);
    }
  }

  if (ctr.Recordings) {
    ctr.Recordings.forEach(r => {
      r.Location = replaceAll(r.Location, bucket, newBucket);
    });
  }
  return ctr;
};

// const waitMs = (ms: number) => {
//   return new Promise(resolve => {
//     setTimeout(resolve, ms);
//   });
// };

export const handler = async (event: S3CreateEvent): Promise<void> => {
  logger.info(event);
  const s3 = new S3();
  const prefix = process.env.PREFIX;
  logger.info(`Found ${event.Records.length} records to process`);
  for (const record of event.Records) {
    try {
      const bucketName = record.s3.bucket.name;
      const objectKey = record.s3.object.key;
      const objectName = getObjectNameFromKey(record.s3.object.key);
      logger.info(`Processing object: ${objectName}`);

      // getObject from S3 and convert to string
      const object = await s3.getObject(bucketName, objectKey);
      const contents = await readableToString(object.Body);
      logger.info(`Contents: ${contents}`);

      const lines = contents.split('\n');
      logger.info(`Found ${lines.length} lines in file`);

      for (const [index, line] of lines.entries()) {
        try {
          if (line.trim().length === 0) {
            // sometimes there is a trailing empty line at end of the file, ignore it
            continue;
          }
          logger.info(`Processing file line: ${index}`);
          logger.info(line);

          const ctr = JSON.parse(line) as IContactTraceRecord;
          const updatedCtr = updateRecordingLocation(
            ctr,
            `connect/${prefix}/${prefix}-recordings`,
            'Analysis/Voice/Redacted'
          );
          logger.info(JSON.stringify(updatedCtr));

          const newObjectKey = objectKey.replace(
            objectName,
            `${ctr.ContactId}_call_recording_redacted_[${ctr.Agent.ConnectedToAgentTimestamp}]`
          );
          logger.info(`Writing new object: ${newObjectKey}`);
          await s3.putObject(bucketName, newObjectKey, JSON.stringify(updatedCtr));
        } catch (e) {
          logger.error(e);
          logger.info(`Unable to process line: ${index}`);
        }
      }
    } catch (e) {
      logger.error(e);
      logger.error(`Unable to process file: ${record.s3.object.key}`);
    }
  }
};
