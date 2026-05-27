import type { TabSchema } from '../types';

const privacyOptions = [
  { value: 'private',  label: 'Private' },
  { value: 'public',   label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
];

export const youtubeTab: TabSchema = {
  id: 'youtube',
  label: 'YouTube',
  tone: 'danger',
  intro: 'Upload generated videos to YouTube. OAuth credentials are managed via the legacy editor.',
  groups: [
    {
      title: 'YouTube uploads',
      fields: [
        { kind: 'bool',     path: ['YOUTUBE', 'ENABLE'],               label: 'Enable' },
        { kind: 'text',     path: ['YOUTUBE', 'SECRETS_FILE'],         label: 'Client secrets file' },
        { kind: 'select',   path: ['YOUTUBE', 'PRIVACY_STATUS'],       label: 'Privacy', options: privacyOptions, coerce: 'string' },
        { kind: 'text',     path: ['YOUTUBE', 'TITLE_TEMPLATE'],       label: 'Title template' },
        { kind: 'textarea', path: ['YOUTUBE', 'DESCRIPTION_TEMPLATE'], label: 'Description template', rows: 4 },
        { kind: 'number',   path: ['YOUTUBE', 'CATEGORY'],             label: 'Category ID', numeric: 'int', help: 'YouTube numeric category id' },
        { kind: 'bool',     path: ['YOUTUBE', 'UPLOAD_VIDEO'],           label: 'Upload timelapse' },
        { kind: 'bool',     path: ['YOUTUBE', 'UPLOAD_MINI_VIDEO'],      label: 'Upload mini-timelapse' },
        { kind: 'bool',     path: ['YOUTUBE', 'UPLOAD_STARTRAIL_VIDEO'], label: 'Upload star-trail video' },
        { kind: 'bool',     path: ['YOUTUBE', 'UPLOAD_PANORAMA_VIDEO'],  label: 'Upload panorama video' },
      ],
    },
  ],
};
