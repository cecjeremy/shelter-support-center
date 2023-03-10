/**
 * Represents known parameters of a Contact Trace Record to avoid errors.
 * Please add new fields as you need them.
 */
export interface RoutingProfile {
  ARN: string;
  Name: string;
}

export interface Agent {
  ARN?: string;
  AfterContactWorkDuration?: number;
  AfterContactWorkEndTimestamp?: Date;
  AfterContactWorkStartTimestamp?: Date;
  AgentInteractionDuration?: number;
  ConnectedToAgentTimestamp?: Date;
  CustomerHoldDuration?: number;
  HierarchyGroups?: any;
  LongestHoldDuration?: number;
  NumberOfHolds?: number;
  RoutingProfile?: RoutingProfile;
  Username?: string;
}

export interface Endpoint {
  Address: string;
  Type: string;
}

export interface MediaStream {
  Type: string;
}

export interface Queue {
  ARN: string;
  DequeueTimestamp: Date;
  Duration: number;
  EnqueueTimestamp: Date;
  Name: string;
}

export interface Recording {
  DeletionReason?: any;
  Location: string;
  Status: string;
  Type: string;
}

export interface RecordingDetail {
  DeletionReason?: any;
  FragmentStartNumber?: any;
  FragmentStopNumber?: any;
  Location: string;
  MediaStreamType: string;
  ParticipantType?: any;
  StartTimestamp?: any;
  Status: string;
  StopTimestamp?: any;
  StorageType: string;
}

export interface Attributes {
  [name: string]: any;
}

export interface IContactTraceRecord {
  AWSAccountId: string;
  AWSContactTraceRecordFormatVersion: string;
  Agent: Agent;
  AgentConnectionAttempts: number;
  Attributes: Attributes;
  Channel: string;
  ConnectedToSystemTimestamp: Date;
  ContactId: string;
  CustomerEndpoint: Endpoint;
  DisconnectTimestamp: Date;
  InitialContactId?: any;
  InitiationMethod: string;
  InitiationTimestamp: Date;
  InstanceARN: string;
  LastUpdateTimestamp: Date;
  MediaStreams: MediaStream[];
  NextContactId?: any;
  PreviousContactId?: any;
  Queue: Queue;
  Recording: Recording;
  Recordings: RecordingDetail[];
  SystemEndpoint: Endpoint;
  TransferCompletedTimestamp?: any;
  TransferredToEndpoint?: any;
}
