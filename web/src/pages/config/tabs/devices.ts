import type { Field, TabSchema } from '../types';

// Dew heater and fan share the same threshold-based control fields.
function thermalControl(section: string, enableField: Field): Field[] {
  return [
    { kind: 'text',   path: [section, 'CLASSNAME'],     label: 'Driver class' },
    { kind: 'text',   path: [section, 'I2C_ADDRESS'],   label: 'I2C address' },
    { kind: 'text',   path: [section, 'PIN_1'],         label: 'Pin' },
    { kind: 'bool',   path: [section, 'INVERT_OUTPUT'], label: 'Invert output' },
    enableField,
    { kind: 'bool',   path: [section, 'THOLD_ENABLE'],  label: 'Threshold control' },
    { kind: 'number', path: [section, 'LEVEL_DEF'],     label: 'Default level', numeric: 'int', min: 0, max: 100, help: '%' },
    { kind: 'number', path: [section, 'LEVEL_LOW'],     label: 'Low level', numeric: 'int', min: 0, max: 100, help: '%' },
    { kind: 'number', path: [section, 'LEVEL_MED'],     label: 'Medium level', numeric: 'int', min: 0, max: 100, help: '%' },
    { kind: 'number', path: [section, 'LEVEL_HIGH'],    label: 'High level', numeric: 'int', min: 0, max: 100, help: '%' },
    { kind: 'number', path: [section, 'THOLD_DIFF_LOW'],  label: 'Low Δ threshold', numeric: 'int' },
    { kind: 'number', path: [section, 'THOLD_DIFF_MED'],  label: 'Medium Δ threshold', numeric: 'int' },
    { kind: 'number', path: [section, 'THOLD_DIFF_HIGH'], label: 'High Δ threshold', numeric: 'int' },
    { kind: 'number', path: [section, 'HOLD_SECONDS'],  label: 'Hold seconds', numeric: 'int' },
    { kind: 'number', path: [section, 'PWM_FREQUENCY'], label: 'PWM frequency', numeric: 'int', help: 'Hz' },
  ];
}

export const devicesTab: TabSchema = {
  id: 'devices',
  label: 'Devices',
  tone: 'danger',
  intro: 'GPIO-attached hardware: focuser, dew heater, fan, generic/manual GPIO, and the device MQTT broker.',
  groups: [
    {
      title: 'Focuser',
      fields: [
        { kind: 'text', path: ['FOCUSER', 'CLASSNAME'],   label: 'Driver class' },
        { kind: 'text', path: ['FOCUSER', 'GPIO_PIN_1'],  label: 'GPIO pin 1' },
        { kind: 'text', path: ['FOCUSER', 'GPIO_PIN_2'],  label: 'GPIO pin 2' },
        { kind: 'text', path: ['FOCUSER', 'GPIO_PIN_3'],  label: 'GPIO pin 3' },
        { kind: 'text', path: ['FOCUSER', 'GPIO_PIN_4'],  label: 'GPIO pin 4' },
        { kind: 'text', path: ['FOCUSER', 'I2C_ADDRESS'], label: 'I2C address' },
      ],
    },
    {
      title: 'Dew heater',
      fields: [
        ...thermalControl('DEW_HEATER', { kind: 'bool', path: ['DEW_HEATER', 'ENABLE_DAY'], label: 'Enable during day' }),
        { kind: 'number', path: ['DEW_HEATER', 'MANUAL_TARGET'],          label: 'Manual target', numeric: 'float', step: 0.1, help: '°C (0 = auto from dewpoint)' },
        { kind: 'text',   path: ['DEW_HEATER', 'TEMP_USER_VAR_SLOT'],     label: 'Temp sensor slot' },
        { kind: 'text',   path: ['DEW_HEATER', 'DEWPOINT_USER_VAR_SLOT'], label: 'Dewpoint sensor slot' },
      ],
    },
    {
      title: 'Fan',
      fields: [
        ...thermalControl('FAN', { kind: 'bool', path: ['FAN', 'ENABLE_NIGHT'], label: 'Enable at night' }),
        { kind: 'number', path: ['FAN', 'TARGET'],             label: 'Target temp', numeric: 'float', step: 0.1, help: '°C' },
        { kind: 'text',   path: ['FAN', 'TEMP_USER_VAR_SLOT'], label: 'Temp sensor slot' },
      ],
    },
    {
      title: 'Generic GPIO',
      fields: [
        { kind: 'text', path: ['GENERIC_GPIO', 'A_CLASSNAME'],     label: 'Driver class' },
        { kind: 'text', path: ['GENERIC_GPIO', 'A_I2C_ADDRESS'],   label: 'I2C address' },
        { kind: 'text', path: ['GENERIC_GPIO', 'A_PIN_1'],         label: 'Pin' },
        { kind: 'bool', path: ['GENERIC_GPIO', 'A_INVERT_OUTPUT'], label: 'Invert output' },
      ],
    },
    {
      title: 'Manual GPIO',
      fields: [
        { kind: 'text', path: ['MANUAL_GPIO', 'A_CLASSNAME'], label: 'Driver class' },
        { kind: 'text', path: ['MANUAL_GPIO', 'A_PIN_1'],     label: 'Pin 1' },
        { kind: 'text', path: ['MANUAL_GPIO', 'A_PIN_2'],     label: 'Pin 2' },
        { kind: 'text', path: ['MANUAL_GPIO', 'A_PIN_3'],     label: 'Pin 3' },
      ],
    },
    {
      title: 'Device MQTT broker',
      fields: [
        { kind: 'text',   path: ['DEVICE', 'MQTT_TRANSPORT'],   label: 'Transport' },
        { kind: 'text',   path: ['DEVICE', 'MQTT_PROTOCOL'],    label: 'Protocol' },
        { kind: 'text',   path: ['DEVICE', 'MQTT_HOST'],        label: 'Host' },
        { kind: 'number', path: ['DEVICE', 'MQTT_PORT'],        label: 'Port', numeric: 'int', min: 1, max: 65535 },
        { kind: 'text',   path: ['DEVICE', 'MQTT_USERNAME'],    label: 'Username' },
        { kind: 'text',   path: ['DEVICE', 'MQTT_PASSWORD'],    label: 'Password' },
        { kind: 'number', path: ['DEVICE', 'MQTT_QOS'],         label: 'QoS', numeric: 'int', min: 0, max: 2 },
        { kind: 'bool',   path: ['DEVICE', 'MQTT_TLS'],         label: 'TLS' },
        { kind: 'bool',   path: ['DEVICE', 'MQTT_CERT_BYPASS'], label: 'Bypass cert validation' },
      ],
    },
  ],
};
