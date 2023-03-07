import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandOutput
} from '@aws-sdk/client-s3';

export class S3 {
  private s3: S3Client;
  constructor() {
    this.s3 = new S3Client({});
  }

  public async getObject(bucket: string, key: string): Promise<GetObjectCommandOutput> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    return response;
  }

  public async putObject(bucket: string, key: string, body: string): Promise<PutObjectCommandOutput> {
    const response = await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body
      })
    );
    return response;
  }
}
