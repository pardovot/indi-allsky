import type { Field, TabSchema } from '../types';

const chartSlotFields: Field[] = [];
for (let i = 1; i <= 9; i++) {
  chartSlotFields.push(
    { kind: 'text',   path: ['CHARTS', `CUSTOM_SLOT_${i}`],     label: `Slot ${i} sensor`, placeholder: 'sensor_user_10' },
    { kind: 'number', path: ['CHARTS', `CUSTOM_SLOT_${i}_MIN`], label: `Slot ${i} min`, numeric: 'float', step: 0.1 },
  );
}

export const adminTab: TabSchema = {
  id: 'admin',
  label: 'Admin',
  tone: 'warning',
  intro: 'Retention, storage locations, health checks, website, custom charts, and security.',
  groups: [
    {
      title: 'Website',
      fields: [
        { kind: 'text',     path: ['WEBSITE', 'TITLE'],       label: 'Site title' },
        { kind: 'textarea', path: ['WEB_STATUS_TEMPLATE'],    label: 'Status template', rows: 3 },
        { kind: 'textarea', path: ['WEB_EXTRA_TEXT'],         label: 'Extra text', rows: 3 },
        { kind: 'bool',     path: ['WEB_NONLOCAL_IMAGES'],    label: 'Serve non-local images' },
        { kind: 'bool',     path: ['WEB_LOCAL_IMAGES_ADMIN'], label: 'Local images for admin network' },
      ],
    },
    {
      title: 'Retention',
      description: 'How long generated media is kept before expiry cleanup.',
      fields: [
        { kind: 'number', path: ['IMAGE_EXPIRE_DAYS'],      label: 'Images', numeric: 'int', help: 'days' },
        { kind: 'number', path: ['IMAGE_RAW_EXPIRE_DAYS'],  label: 'Raw images', numeric: 'int', help: 'days' },
        { kind: 'number', path: ['IMAGE_FITS_EXPIRE_DAYS'], label: 'FITS', numeric: 'int', help: 'days' },
        { kind: 'number', path: ['TIMELAPSE_EXPIRE_DAYS'],  label: 'Timelapses', numeric: 'int', help: 'days' },
        { kind: 'bool',   path: ['TIMELAPSE_OVERWRITE'],    label: 'Overwrite timelapses' },
        { kind: 'number', path: ['BACKUP_DB_PERIOD_DAYS'],  label: 'DB backup period', numeric: 'int', help: 'days' },
      ],
    },
    {
      title: 'Storage',
      fields: [
        { kind: 'text', path: ['IMAGE_FOLDER'],  label: 'Image folder' },
        { kind: 'text', path: ['VARLIB_FOLDER'], label: 'Var-lib folder' },
      ],
    },
    {
      title: 'Health check',
      fields: [
        { kind: 'number', path: ['HEALTHCHECK', 'DISK_USAGE'], label: 'Disk usage alert', numeric: 'float', step: 0.1, help: '% full' },
        { kind: 'number', path: ['HEALTHCHECK', 'SWAP_USAGE'], label: 'Swap usage alert', numeric: 'float', step: 0.1, help: '% used' },
      ],
    },
    {
      title: 'Custom chart slots',
      description: 'Map sensor data slots into the dashboard charts. Slot names look like sensor_user_10.',
      fields: chartSlotFields,
    },
    {
      title: 'Security',
      fields: [
        { kind: 'bool', path: ['ENCRYPT_PASSWORDS'], label: 'Encrypt stored passwords', help: 'Encrypts upload/API credentials at rest. Cannot be undone via this form.' },
      ],
    },
  ],
};
