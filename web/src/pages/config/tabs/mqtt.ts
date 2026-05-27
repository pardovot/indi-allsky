import type { TabSchema } from '../types';

const transportOptions = [
  { value: 'tcp',        label: 'tcp' },
  { value: 'websockets', label: 'websockets' },
];

const protocolOptions = [
  { value: 'MQTTv5',   label: 'v5.0' },
  { value: 'MQTTv311', label: 'v3.1.1' },
];

export const mqttTab: TabSchema = {
  id: 'mqtt',
  label: 'MQTT',
  tone: 'info',
  intro: 'Publish capture status and images to an MQTT broker.',
  groups: [
    {
      title: 'MQTT publishing',
      fields: [
        { kind: 'bool',   path: ['MQTTPUBLISH', 'ENABLE'],        label: 'Enable' },
        { kind: 'select', path: ['MQTTPUBLISH', 'TRANSPORT'],     label: 'Transport', options: transportOptions, coerce: 'string' },
        { kind: 'select', path: ['MQTTPUBLISH', 'PROTOCOL'],      label: 'Protocol', options: protocolOptions, coerce: 'string' },
        { kind: 'text',   path: ['MQTTPUBLISH', 'HOST'],          label: 'Host' },
        { kind: 'number', path: ['MQTTPUBLISH', 'PORT'],          label: 'Port', numeric: 'int', min: 1, max: 65535 },
        { kind: 'text',   path: ['MQTTPUBLISH', 'USERNAME'],      label: 'Username' },
        { kind: 'text',   path: ['MQTTPUBLISH', 'PASSWORD'],      label: 'Password' },
        { kind: 'text',   path: ['MQTTPUBLISH', 'BASE_TOPIC'],    label: 'Base topic' },
        { kind: 'number', path: ['MQTTPUBLISH', 'QOS'],           label: 'QoS', numeric: 'int', min: 0, max: 2 },
        { kind: 'bool',   path: ['MQTTPUBLISH', 'TLS'],           label: 'TLS' },
        { kind: 'bool',   path: ['MQTTPUBLISH', 'CERT_BYPASS'],   label: 'Bypass cert validation' },
        { kind: 'bool',   path: ['MQTTPUBLISH', 'PUBLISH_IMAGE'], label: 'Publish image' },
      ],
    },
  ],
};
