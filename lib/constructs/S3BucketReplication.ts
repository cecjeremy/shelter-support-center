import { Construct } from 'constructs';
import { IRole, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnBucket } from 'aws-cdk-lib/aws-s3';
import { CfnOutput } from 'aws-cdk-lib';

export interface S3BucketReplicationProps {
  /**
   * Rule Id
   * Unique Rule Id for this rule
   * Providing this id prevents AWS from generating random number id
   * which makes it hard to tell the rules apart
   */
  ruleId: string;

  /**
   * Source Bucket as L1 CfnBucket
   * Required for adding Replication Configuration
   * Passing in this way helps prevent circular dependencies
   */
  sourceBucket: CfnBucket;

  /**
   * Source prefix to replicate
   * Ex: 'Analysis/Voice/Redacted/'
   */
  filterPrefix?: string;

  /**
   * Source encryption key
   * Will be neeeded to decrypt data replicated to destination bucket
   */
  sourceDecryptKeyArn: string;

  /**
   * Account the destination bucket is in
   */
  destAcct: string;

  /**
   * Destination bucket name
   */
  destBucketName: string;

  /**
   * Destination encryption key
   * Permissions will be neeeded encrypt data to the destination bucket
   */
  destEncryptKeyArn: string;

  /**
   * Allows you to use the existing replication Role.
   * Use this if the Replication Role for the source bucket already exists
   */
  role?: IRole;
}

type AccessControlTranslation = {
  owner: 'Destination';
};

type EncryptionConfiguration = {
  replicaKmsKeyId: string;
};

type ReplicationTimeValue = {
  minutes: number;
};

type Metrics = {
  status: string;
  eventThreshold: ReplicationTimeValue;
};

type ReplicationTime = {
  status: string;
  time: ReplicationTimeValue;
};

type ReplicationDestination = {
  account: string;
  bucket: string;
  accessControlTranslation: AccessControlTranslation;
  encryptionConfiguration?: EncryptionConfiguration;
  metrics?: Metrics;
  replicationTime?: ReplicationTime;
  storageClass?: string;
};

type DeleteMarkerReplication = {
  status: string;
};

type TagFilter = Record<string, string>;

type ReplicationRuleAndOperator = {
  prefix: string;
  tagFilters: TagFilter[];
};

type ReplicationRuleFilter = {
  prefix: string;
};

type SseKmsEncryptedObjects = {
  status: string;
};

type ReplicaModifications = {
  status: string;
};

type SourceSelectionCriteria = {
  sseKmsEncryptedObjects: SseKmsEncryptedObjects;
  replicaModifications?: ReplicaModifications;
};

type ReplicationRule = {
  id: string;
  status: string;
  filter: ReplicationRuleFilter;
  priority: number;
  deleteMarkerReplication: DeleteMarkerReplication;
  destination: ReplicationDestination;
  sourceSelectionCriteria: SourceSelectionCriteria;
};

type ReplicationConfiguration = {
  role: string;
  rules: ReplicationRule[];
};

export class S3BucketReplication extends Construct {
  readonly role: IRole;
  readonly bucket: CfnBucket;
  constructor(scope: Construct, id: string, props: S3BucketReplicationProps) {
    super(scope, id);

    this.bucket = props.sourceBucket;

    // Use the existing replication Role or create a new one
    // If more than one replication rule is created per stack and a new role is created,
    // subsequent Replication Rules should reference the role from it's deterministic arn:
    // arn:aws:iam::{account}:role/${this.bucket.bucketName}-replication-role
    if (props.role) {
      this.role = props.role;
    } else {
      this.role = new Role(this, 'ReplicationRole', {
        roleName: `${this.bucket.bucketName}-replication-role`,
        assumedBy: new ServicePrincipal('s3.amazonaws.com')
      });
    }

    const { ruleId, sourceDecryptKeyArn, destAcct, destBucketName, destEncryptKeyArn } = props;
    const sourceBucketName = this.bucket.bucketName;

    // enable versioning on the bucket
    this.bucket.versioningConfiguration = { status: 'Enabled' };

    // get bucket arns for policy statements
    const sourceBucket = `arn:aws:s3:::${sourceBucketName}`;
    const sourceObjects = `${sourceBucket}/*`;
    const destinationBucket = `arn:aws:s3:::${destBucketName}`;
    const destinationObjects = `${destinationBucket}/*`;

    // Replication Policy Statements
    const policyStatements: PolicyStatement[] = [];
    policyStatements.push(
      new PolicyStatement({
        actions: ['s3:ListBucket', 's3:GetReplicationConfiguration'],
        resources: [sourceBucket]
      })
    );
    policyStatements.push(
      new PolicyStatement({
        actions: [
          's3:GetObjectVersion',
          's3:GetObjectVersionAcl',
          's3:GetObjectVersionTagging',
          's3:GetObjectVersionForReplication',
          's3:GetObjectLegalHold',
          's3:GetObjectRetention'
        ],
        resources: [sourceObjects]
      })
    );
    policyStatements.push(
      new PolicyStatement({
        actions: [
          's3:ReplicateObject',
          's3:ReplicateDelete',
          's3:ReplicateTags',
          's3:GetObjectVersionTagging',
          's3:ObjectOwnerOverrideToBucketOwner'
        ],
        resources: [destinationObjects]
      })
    );
    policyStatements.push(
      new PolicyStatement({
        actions: ['kms:Decrypt'],
        resources: [`${sourceDecryptKeyArn}`]
      })
    );
    policyStatements.push(
      new PolicyStatement({
        actions: ['kms:Encrypt'],
        resources: [`${destEncryptKeyArn}`]
      })
    );

    new ManagedPolicy(this, 'ReplicationRoleManagedPolicy', {
      description: 'Replication Role Policy',
      statements: policyStatements,
      roles: [this.role]
    });

    // Get other replication rules for this bucket
    const currentConfiguration = this.bucket.replicationConfiguration as unknown as ReplicationConfiguration;
    let replicationRules: ReplicationRule[] = [];
    let lowestPriority = 0;
    if (currentConfiguration && currentConfiguration.rules) {
      replicationRules = currentConfiguration.rules;
      // get lowest priority of existing rules
      // priorities must be unique
      replicationRules.map(rule => {
        if (rule.priority > lowestPriority) {
          lowestPriority = rule.priority;
        }
      });
    }

    // add this new replication rule
    replicationRules.push({
      id: ruleId,
      status: 'Enabled',
      filter: { prefix: props.filterPrefix || '/' },
      priority: lowestPriority + 1,
      deleteMarkerReplication: { status: 'Enabled' },
      destination: {
        account: destAcct,
        bucket: `arn:aws:s3:::${destBucketName}`,
        accessControlTranslation: { owner: 'Destination' },
        encryptionConfiguration: {
          replicaKmsKeyId: `${destEncryptKeyArn}`
        }
        // RTC configuration
        // Example if needed:
        // metrics: { status: 'Enabled', eventThreshold: { minutes: 15 } },
        // replicationTime: { status: 'Enabled', time: { minutes: 15 } }
      },
      // SseKmsEncryptedObjects must be specified if EncryptionConfiguration is present.
      sourceSelectionCriteria: { sseKmsEncryptedObjects: { status: 'Enabled' } }
    });

    // Add Bucket Replication Rule
    this.bucket.replicationConfiguration = {
      role: this.role.roleArn,
      rules: replicationRules
    };

    // Cfn Outputs
    new CfnOutput(this, 'RoleArn', {
      value: this.role.roleArn,
      description: `Replication Role for: ${sourceBucketName}`
    });
  }
}
