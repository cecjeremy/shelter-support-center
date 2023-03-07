import { S3Client, GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';

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
}
