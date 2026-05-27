import type { Field, TabSchema } from '../types';

const classnameOptions = [
  { value: 'pycurl_sftp',         label: 'PycURL SFTP [22]' },
  { value: 'pycurl_ftpes',        label: 'PycURL FTPS [21] (FTPES)' },
  { value: 'pycurl_ftp',          label: 'PycURL FTP [21] — no encryption' },
  { value: 'pycurl_webdav_https', label: 'PycURL WebDAV HTTPS [443]' },
  { value: 'paramiko_sftp',       label: 'Paramiko SFTP [22]' },
  { value: 'python_ftp',          label: 'Python FTP [21] — no encryption' },
  { value: 'python_ftpes',        label: 'Python FTPS [21] (FTPES)' },
  { value: 'pycurl_ftps',         label: 'PycURL FTPS [990] (uncommon)' },
];

// REMOTE_<thing>_NAME + _FOLDER pairs.
const remoteTargets: [string, string][] = [
  ['IMAGE', 'Image'],
  ['PANORAMA', 'Panorama'],
  ['METADATA', 'Metadata'],
  ['RAW', 'Raw'],
  ['FITS', 'FITS'],
  ['VIDEO', 'Video'],
  ['MINI_VIDEO', 'Mini video'],
  ['KEOGRAM', 'Keogram'],
  ['STARTRAIL', 'Star trail'],
  ['STARTRAIL_VIDEO', 'Star trail video'],
  ['PANORAMA_VIDEO', 'Panorama video'],
  ['REALTIME_KEOGRAM', 'Realtime keogram'],
];

const remoteNameFields: Field[] = [];
for (const [key, label] of remoteTargets) {
  remoteNameFields.push(
    { kind: 'text', path: ['FILETRANSFER', `REMOTE_${key}_NAME`],   label: `${label} name` },
    { kind: 'text', path: ['FILETRANSFER', `REMOTE_${key}_FOLDER`], label: `${label} folder` },
  );
}
// Folder-only remote targets.
for (const [key, label] of [
  ['ENDOFNIGHT', 'End of night'],
  ['LATEST', 'Latest'],
  ['DB_BACKUP', 'DB backup'],
] as [string, string][]) {
  remoteNameFields.push(
    { kind: 'text', path: ['FILETRANSFER', `REMOTE_${key}_FOLDER`], label: `${label} folder` },
  );
}

export const filetransferTab: TabSchema = {
  id: 'filetransfer',
  label: 'File Transfer',
  tone: 'primary',
  intro: 'Upload media to a remote server over FTP/SFTP/WebDAV.',
  groups: [
    {
      title: 'Connection',
      fields: [
        { kind: 'select', path: ['FILETRANSFER', 'CLASSNAME'],        label: 'Protocol', options: classnameOptions, coerce: 'string' },
        { kind: 'text',   path: ['FILETRANSFER', 'HOST'],             label: 'Host' },
        { kind: 'number', path: ['FILETRANSFER', 'PORT'],             label: 'Port', numeric: 'int', min: 0, max: 65535, help: '0 = protocol default' },
        { kind: 'text',   path: ['FILETRANSFER', 'USERNAME'],         label: 'Username' },
        { kind: 'text',   path: ['FILETRANSFER', 'PASSWORD'],         label: 'Password' },
        { kind: 'text',   path: ['FILETRANSFER', 'PRIVATE_KEY'],      label: 'Private key' },
        { kind: 'text',   path: ['FILETRANSFER', 'PUBLIC_KEY'],       label: 'Public key' },
        { kind: 'number', path: ['FILETRANSFER', 'CONNECT_TIMEOUT'],  label: 'Connect timeout', numeric: 'float', step: 0.1, help: 'seconds' },
        { kind: 'number', path: ['FILETRANSFER', 'TIMEOUT'],          label: 'Timeout', numeric: 'float', step: 0.1, help: 'seconds' },
        { kind: 'bool',   path: ['FILETRANSFER', 'CERT_BYPASS'],      label: 'Bypass cert validation' },
        { kind: 'bool',   path: ['FILETRANSFER', 'ATOMIC_TRANSFERS'], label: 'Atomic transfers' },
        { kind: 'bool',   path: ['FILETRANSFER', 'FORCE_IPV4'],       label: 'Force IPv4' },
        { kind: 'bool',   path: ['FILETRANSFER', 'FORCE_IPV6'],       label: 'Force IPv6' },
        { kind: 'number', path: ['UPLOAD_WORKERS'],                  label: 'Upload workers', numeric: 'int', min: 1 },
      ],
    },
    {
      title: 'What to upload',
      description: 'Counts (every N images) for image/panorama; toggles for everything else.',
      fields: [
        { kind: 'number', path: ['FILETRANSFER', 'UPLOAD_IMAGE'],            label: 'Image every', numeric: 'int', help: 'N images (0 disables)' },
        { kind: 'number', path: ['FILETRANSFER', 'UPLOAD_PANORAMA'],         label: 'Panorama every', numeric: 'int', help: 'N images (0 disables)' },
        { kind: 'number', path: ['FILETRANSFER', 'UPLOAD_REALTIME_KEOGRAM'], label: 'Realtime keogram every', numeric: 'int', help: 'N images (0 disables)' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_METADATA'],         label: 'Metadata' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_VIDEO'],            label: 'Timelapse video' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_MINI_VIDEO'],       label: 'Mini video' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_RAW'],              label: 'Raw' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_FITS'],             label: 'FITS' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_KEOGRAM'],          label: 'Keogram' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_STARTRAIL'],        label: 'Star trail' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_STARTRAIL_VIDEO'],  label: 'Star trail video' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_PANORAMA_VIDEO'],   label: 'Panorama video' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_ENDOFNIGHT'],       label: 'End of night' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_LATEST_IMAGE'],     label: 'Latest image' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_LATEST_PANORAMA'],  label: 'Latest panorama' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_LATEST_RAW'],       label: 'Latest raw' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_LATEST_VIDEO'],     label: 'Latest video' },
        { kind: 'bool',   path: ['FILETRANSFER', 'UPLOAD_DB_BACKUP'],        label: 'DB backup' },
      ],
    },
    {
      title: 'Remote names & folders',
      description: 'Templates for remote filenames and destination folders.',
      fields: remoteNameFields,
    },
  ],
};
