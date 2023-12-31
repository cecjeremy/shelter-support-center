import { S3CreateEvent } from 'aws-lambda';
import { Logger } from '@voicefoundry-cloud/vf-logger';
import { S3 } from '../../services/s3';
import { IContactTraceRecord } from '../../interfaces/IContactTraceRecord';

const logger = new Logger({
  level: process.env.LOGGING_LEVEL?.toLowerCase() || 'debug',
  formatters: {
    level: (label: string) => {
      return { level: label };
    }
  }
});

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

export const handler = async (event: S3CreateEvent): Promise<void> => {
  logger.info(JSON.stringify(event));
  const s3 = new S3();
  const cdkStackPrefix = process.env.CDK_STACK_PREFIX;
  logger.info(`Found ${event.Records.length} records to process`);
  for (const record of event.Records) {
    const storageBucketName = process.env.RECORDING_BUCKET_NAME;
    const bucketName = record.s3.bucket.name;
    const objectKey = record.s3.object.key;
    const objectName = getObjectNameFromKey(record.s3.object.key);
    logger.info(`Processing object: ${objectName}`);

    // getObject from S3 and convert to string
    const object = await s3.getObject(bucketName, objectKey); //each s3 file
    let newObject = '';
    if (objectKey.includes('ctr')) {
      const contents = await readableToString(object.Body);
      logger.info(`Contents: ${contents}`);

      const lines = contents.split('\n');
      logger.info(`Found ${lines.length} lines in file`);

      for (const [index, line] of lines.entries()) {
        if (line.trim().length === 0) {
          // sometimes there is a trailing empty line at end of the file, ignore it
          logger.info(`Skipping line ${index} as it is empty`);
          continue;
        }
        logger.info(`Processing file line: ${index}`);

        let ctr = JSON.parse(line) as IContactTraceRecord;
        if (ctr.Agent?.ConnectedToAgentTimestamp) {
          //split string on / and get last item in array
          const wavFileName = ctr.Recording.Location.split('/')[ctr.Recording.Location.split('/').length - 1];

          ctr = updateRecordingLocation(
            ctr,
            `${storageBucketName}/connect/${cdkStackPrefix}/${cdkStackPrefix}-recordings/`,
            `${bucketName}/Analysis/Voice/Redacted/`
          );

          ctr = updateRecordingLocation(
            ctr,
            wavFileName,
            `${ctr.ContactId}_call_recording_redacted_${ctr.Agent.ConnectedToAgentTimestamp}.wav`
          );
          logger.info('Successfully updated record location');
        }
        newObject += JSON.stringify(ctr) + '\n';
      }
    } else {
      newObject = await readableToString(object.Body);
    }
    const newObjectKey = objectKey.replace('original/', '');
    logger.info(`newObjectKey: ${newObjectKey}`);
    logger.info(`newObject: ${newObject}`);
    const response = await s3.putObject(bucketName, newObjectKey, newObject);
    if (response.$metadata.httpStatusCode !== 200) {
      logger.error(response.$metadata.httpStatusCode);
      logger.error(`Unable to process file: ${record.s3.object.key}`);
      logger.error(response);
    }
    logger.info(`Processed file: ${record.s3.object.key}`);
  }
  logger.info('Completed processing');
};
