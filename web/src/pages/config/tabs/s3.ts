import type { TabSchema } from '../types';

const classnameOptions = [
  { value: 'boto3_s3',      label: 'AWS S3 (boto3)' },
  { value: 'boto3_minio',   label: 'Minio (boto3)' },
  { value: 'boto3_generic', label: 'Generic (boto3)' },
  { value: 'libcloud_s3',   label: 'Apache Libcloud (AWS)' },
  { value: 'gcp_storage',   label: 'Google Cloud Storage' },
  { value: 'oci_storage',   label: 'Oracle OCI Storage' },
];

export const s3Tab: TabSchema = {
  id: 's3',
  label: 'Object Storage',
  tone: 'secondary',
  intro: 'Upload media to S3-compatible object storage (AWS, Minio, GCS, OCI, …).',
  groups: [
    {
      title: 'Provider',
      fields: [
        { kind: 'select', path: ['S3UPLOAD', 'CLASSNAME'], label: 'Provider', options: classnameOptions, coerce: 'string' },
        { kind: 'bool',   path: ['S3UPLOAD', 'ENABLE'],    label: 'Enable' },
      ],
    },
    {
      title: 'Credentials',
      fields: [
        { kind: 'text', path: ['S3UPLOAD', 'ACCESS_KEY'], label: 'Access key' },
        { kind: 'text', path: ['S3UPLOAD', 'SECRET_KEY'], label: 'Secret key' },
        { kind: 'text', path: ['S3UPLOAD', 'CREDS_FILE'], label: 'Credentials file' },
      ],
    },
    {
      title: 'Endpoint',
      fields: [
        { kind: 'text',   path: ['S3UPLOAD', 'BUCKET'],          label: 'Bucket' },
        { kind: 'text',   path: ['S3UPLOAD', 'REGION'],          label: 'Region' },
        { kind: 'text',   path: ['S3UPLOAD', 'NAMESPACE'],       label: 'Namespace' },
        { kind: 'text',   path: ['S3UPLOAD', 'HOST'],            label: 'Host' },
        { kind: 'text',   path: ['S3UPLOAD', 'ENDPOINT_URL'],    label: 'Endpoint URL' },
        { kind: 'number', path: ['S3UPLOAD', 'PORT'],            label: 'Port', numeric: 'int' },
        { kind: 'number', path: ['S3UPLOAD', 'CONNECT_TIMEOUT'], label: 'Connect timeout', numeric: 'float', step: 0.1, help: 'seconds' },
        { kind: 'number', path: ['S3UPLOAD', 'TIMEOUT'],         label: 'Timeout', numeric: 'float', step: 0.1, help: 'seconds' },
        { kind: 'bool',   path: ['S3UPLOAD', 'TLS'],             label: 'TLS' },
        { kind: 'bool',   path: ['S3UPLOAD', 'CERT_BYPASS'],     label: 'Bypass cert validation' },
      ],
    },
    {
      title: 'Object options',
      fields: [
        { kind: 'text', path: ['S3UPLOAD', 'URL_TEMPLATE'],  label: 'URL template' },
        { kind: 'text', path: ['S3UPLOAD', 'STORAGE_CLASS'], label: 'Storage class' },
        { kind: 'text', path: ['S3UPLOAD', 'ACL'],           label: 'ACL' },
        { kind: 'bool', path: ['S3UPLOAD', 'UPLOAD_FITS'],   label: 'Upload FITS' },
        { kind: 'bool', path: ['S3UPLOAD', 'UPLOAD_RAW'],    label: 'Upload raw' },
      ],
    },
  ],
};
