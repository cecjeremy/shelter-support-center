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
const updateRecordingLocation = (ctr: IContactTraceRecord, bucket: string, newBucket: string): IContactTraceRecord => {
  if (ctr.Recording) {
    if (ctr.Recording.Location) {
      ctr.Recording.Location = ctr.Recording.Location.replace(bucket, newBucket);
    }
  }

  if (ctr.Recordings) {
    ctr.Recordings.forEach(r => {
      r.Location = r.Location.replace(bucket, newBucket);
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
  const s3 = new S3();
  const prefix = process.env.PREFIX;

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const objectName = getObjectNameFromKey(record.s3.object.key);
    const object = await s3.getObject(bucketName, objectName);
    const contents = await readableToString(object.Body);
    const lines = contents.split('\n');

    for (const [index, line] of lines) {
      if (line.trim().length === 0) {
        // sometimes there is a trailing empty line at end of the file, ignore it
        continue;
      }
      logger.debug(`Processing file line: ${index}`);
      logger.debug(line);

      const ctr = JSON.parse(line) as IContactTraceRecord;
      const updatedCtr = updateRecordingLocation(
        ctr,
        `connect/${prefix}/${prefix}-recordings`,
        'Analysis/Voice/Redacted'
      );
      logger.debug(JSON.stringify(updatedCtr));
    }
  }
};
