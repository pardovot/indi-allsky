import type { TabSchema } from '../types';

export const syncapiTab: TabSchema = {
  id: 'syncapi',
  label: 'SyncAPI',
  tone: 'light',
  intro: 'Sync images and metadata to another indi-allsky instance via its API.',
  groups: [
    {
      title: 'SyncAPI',
      fields: [
        { kind: 'bool',   path: ['SYNCAPI', 'ENABLE'],          label: 'Enable' },
        { kind: 'text',   path: ['SYNCAPI', 'BASEURL'],         label: 'Base URL' },
        { kind: 'text',   path: ['SYNCAPI', 'USERNAME'],        label: 'Username' },
        { kind: 'text',   path: ['SYNCAPI', 'APIKEY'],          label: 'API key' },
        { kind: 'bool',   path: ['SYNCAPI', 'CERT_BYPASS'],     label: 'Bypass cert validation' },
        { kind: 'bool',   path: ['SYNCAPI', 'POST_S3'],         label: 'Post to S3' },
        { kind: 'bool',   path: ['SYNCAPI', 'EMPTY_FILE'],      label: 'Send empty file' },
        { kind: 'number', path: ['SYNCAPI', 'UPLOAD_IMAGE'],    label: 'Upload image every', numeric: 'int', help: 'N images (0 disables)' },
        { kind: 'number', path: ['SYNCAPI', 'UPLOAD_PANORAMA'], label: 'Upload panorama every', numeric: 'int', help: 'N images (0 disables)' },
        { kind: 'number', path: ['SYNCAPI', 'CONNECT_TIMEOUT'], label: 'Connect timeout', numeric: 'float', step: 0.1, help: 'seconds' },
        { kind: 'number', path: ['SYNCAPI', 'TIMEOUT'],         label: 'Timeout', numeric: 'float', step: 0.1, help: 'seconds' },
      ],
    },
  ],
};
