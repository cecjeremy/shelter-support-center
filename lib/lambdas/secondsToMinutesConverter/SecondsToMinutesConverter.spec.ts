import { ConnectContactFlowEvent } from 'aws-lambda';

import logger from '../../services/logger';

import { handler } from './handler';

const connectEvent: ConnectContactFlowEvent = {
  Name: 'ContactFlowEvent',
  Details: {
    ContactData: {
      Attributes: {},
      Channel: 'VOICE',
      ContactId: 'abc',
      CustomerEndpoint: {
        Address: '+11234567890',
        Type: 'TELEPHONE_NUMBER'
      },
      InitialContactId: 'abc',
      InitiationMethod: 'INBOUND',
      InstanceARN: 'arn',
      PreviousContactId: 'abc',
      Queue: {
        ARN: 'arn',
        Name: 'Queue_Name'
      },
      SystemEndpoint: {
        Address: '+18885559999',
        Type: 'TELEPHONE_NUMBER'
      },
      MediaStreams: {
        Customer: {
          Audio: null
        }
      }
    },
    Parameters: {
      seconds: '123'
    }
  }
};

test('handler is is a function', () => {
  expect(typeof handler).toBe('function');
});

test('gets time back', async () => {
  try {
    const res = await handler(connectEvent);
    expect(res.minutes).toBe(3);
  } catch (err) {
    logger.error('error in time math', { err });
  }
});
