import type { Field, FieldGroup, TabSchema } from '../types';

function sensorSlot(letter: string): FieldGroup {
  const p = (k: string): [string, string] => ['TEMP_SENSOR', `${letter}_${k}`];
  return {
    title: `Sensor ${letter}`,
    fields: [
      { kind: 'text', path: p('CLASSNAME'),      label: 'Driver class' },
      { kind: 'text', path: p('LABEL'),          label: 'Label' },
      { kind: 'text', path: p('PIN_1'),          label: 'Pin 1' },
      { kind: 'text', path: p('PIN_2'),          label: 'Pin 2' },
      { kind: 'text', path: p('USER_VAR_SLOT'),  label: 'User var slot' },
      { kind: 'text', path: p('I2C_ADDRESS'),    label: 'I2C address' },
      { kind: 'text', path: p('TITLE_TEMPLATE'), label: 'Title template' },
    ],
  };
}

const weatherApiGroup: FieldGroup = {
  title: 'Weather service API keys',
  fields: [
    { kind: 'text', path: ['TEMP_SENSOR', 'OPENWEATHERMAP_APIKEY'],         label: 'OpenWeatherMap key' },
    { kind: 'text', path: ['TEMP_SENSOR', 'WUNDERGROUND_APIKEY'],           label: 'Weather Underground key' },
    { kind: 'text', path: ['TEMP_SENSOR', 'ASTROSPHERIC_APIKEY'],           label: 'Astrospheric key' },
    { kind: 'text', path: ['TEMP_SENSOR', 'AMBIENTWEATHER_APIKEY'],         label: 'AmbientWeather API key' },
    { kind: 'text', path: ['TEMP_SENSOR', 'AMBIENTWEATHER_APPLICATIONKEY'], label: 'AmbientWeather app key' },
    { kind: 'text', path: ['TEMP_SENSOR', 'AMBIENTWEATHER_MACADDRESS'],     label: 'AmbientWeather MAC' },
    { kind: 'text', path: ['TEMP_SENSOR', 'ECOWITT_APIKEY'],                label: 'Ecowitt API key' },
    { kind: 'text', path: ['TEMP_SENSOR', 'ECOWITT_APPLICATIONKEY'],        label: 'Ecowitt app key' },
    { kind: 'text', path: ['TEMP_SENSOR', 'ECOWITT_MACADDRESS'],            label: 'Ecowitt MAC' },
  ],
};

const mqttGroup: FieldGroup = {
  title: 'MQTT broker sensor',
  fields: [
    { kind: 'text',   path: ['TEMP_SENSOR', 'MQTT_TRANSPORT'],   label: 'Transport' },
    { kind: 'text',   path: ['TEMP_SENSOR', 'MQTT_PROTOCOL'],    label: 'Protocol' },
    { kind: 'text',   path: ['TEMP_SENSOR', 'MQTT_HOST'],        label: 'Host' },
    { kind: 'number', path: ['TEMP_SENSOR', 'MQTT_PORT'],        label: 'Port', numeric: 'int', min: 1, max: 65535 },
    { kind: 'text',   path: ['TEMP_SENSOR', 'MQTT_USERNAME'],    label: 'Username' },
    { kind: 'text',   path: ['TEMP_SENSOR', 'MQTT_PASSWORD'],    label: 'Password' },
    { kind: 'bool',   path: ['TEMP_SENSOR', 'MQTT_TLS'],         label: 'TLS' },
    { kind: 'bool',   path: ['TEMP_SENSOR', 'MQTT_CERT_BYPASS'], label: 'Bypass cert validation' },
  ],
};

const tuningFields: Field[] = [
  { kind: 'bool',   path: ['TEMP_SENSOR', 'DHT_USE_PULSEIO'],          label: 'DHT use pulseio' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'SHT3X_HEATER_NIGHT'],       label: 'SHT3x heater (night)' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'SHT3X_HEATER_DAY'],         label: 'SHT3x heater (day)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'SHT4X_MODE_NIGHT'],         label: 'SHT4x mode (night)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'SHT4X_MODE_DAY'],           label: 'SHT4x mode (day)' },
  { kind: 'number', path: ['TEMP_SENSOR', 'SI7021_HEATER_LEVEL_NIGHT'], label: 'Si7021 heater (night)', numeric: 'int' },
  { kind: 'number', path: ['TEMP_SENSOR', 'SI7021_HEATER_LEVEL_DAY'],   label: 'Si7021 heater (day)', numeric: 'int' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'HTU31D_HEATER_NIGHT'],      label: 'HTU31D heater (night)' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'HTU31D_HEATER_DAY'],        label: 'HTU31D heater (day)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'HDC302X_HEATER_NIGHT'],     label: 'HDC302x heater (night)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'HDC302X_HEATER_DAY'],       label: 'HDC302x heater (day)' },
  { kind: 'number', path: ['TEMP_SENSOR', 'TSL2561_GAIN_NIGHT'],       label: 'TSL2561 gain (night)', numeric: 'int' },
  { kind: 'number', path: ['TEMP_SENSOR', 'TSL2561_GAIN_DAY'],         label: 'TSL2561 gain (day)', numeric: 'int' },
  { kind: 'number', path: ['TEMP_SENSOR', 'TSL2561_INT_NIGHT'],        label: 'TSL2561 integration (night)', numeric: 'int' },
  { kind: 'number', path: ['TEMP_SENSOR', 'TSL2561_INT_DAY'],          label: 'TSL2561 integration (day)', numeric: 'int' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'TSL2561_DISABLE_DAY'],      label: 'TSL2561 disable (day)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'TSL2591_GAIN_NIGHT'],       label: 'TSL2591 gain (night)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'TSL2591_GAIN_DAY'],         label: 'TSL2591 gain (day)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'TSL2591_INT_NIGHT'],        label: 'TSL2591 integration (night)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'TSL2591_INT_DAY'],          label: 'TSL2591 integration (day)' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'TSL2591_DISABLE_DAY'],      label: 'TSL2591 disable (day)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'VEML7700_GAIN_NIGHT'],      label: 'VEML7700 gain (night)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'VEML7700_GAIN_DAY'],        label: 'VEML7700 gain (day)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'VEML7700_INT_NIGHT'],       label: 'VEML7700 integration (night)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'VEML7700_INT_DAY'],         label: 'VEML7700 integration (day)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'SI1145_VIS_GAIN_NIGHT'],    label: 'SI1145 vis gain (night)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'SI1145_VIS_GAIN_DAY'],      label: 'SI1145 vis gain (day)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'SI1145_IR_GAIN_NIGHT'],     label: 'SI1145 IR gain (night)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'SI1145_IR_GAIN_DAY'],       label: 'SI1145 IR gain (day)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'LTR390_GAIN_NIGHT'],        label: 'LTR390 gain (night)' },
  { kind: 'text',   path: ['TEMP_SENSOR', 'LTR390_GAIN_DAY'],          label: 'LTR390 gain (day)' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'INA3221_CH1_ENABLE'],       label: 'INA3221 channel 1' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'INA3221_CH2_ENABLE'],       label: 'INA3221 channel 2' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'INA3221_CH3_ENABLE'],       label: 'INA3221 channel 3' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'AS3935_OUTDOOR_MODE'],      label: 'AS3935 outdoor mode' },
  { kind: 'bool',   path: ['TEMP_SENSOR', 'AS3935_MASK_DISTURBER'],    label: 'AS3935 mask disturber' },
  { kind: 'number', path: ['TEMP_SENSOR', 'AS3935_NOISE_LEVEL'],       label: 'AS3935 noise level', numeric: 'int' },
  { kind: 'number', path: ['TEMP_SENSOR', 'AS3935_SPIKE_REJECTION'],   label: 'AS3935 spike rejection', numeric: 'int' },
  { kind: 'number', path: ['TEMP_SENSOR', 'LUX_MAGNITUDE_OFFSET'],     label: 'Lux magnitude offset', numeric: 'float', step: 0.1 },
];

export const sensorsTab: TabSchema = {
  id: 'sensors',
  label: 'Sensors',
  tone: 'primary',
  intro:
    'Temperature/humidity/light/lightning sensors (slots A–F), weather service integrations, and ' +
    'per-chip tuning. Driver-class and gain/mode fields accept the same string values as the legacy editor.',
  groups: [
    sensorSlot('A'),
    sensorSlot('B'),
    sensorSlot('C'),
    sensorSlot('D'),
    sensorSlot('E'),
    sensorSlot('F'),
    weatherApiGroup,
    mqttGroup,
    { title: 'Chip tuning', fields: tuningFields },
  ],
};
