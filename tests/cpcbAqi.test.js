import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCpcbAqi, calculateCpcbSubIndex, classifyCpcbAqi } from '../src/services/cpcbAqi.js';

test('calculateCpcbSubIndex computes exact CPCB breakpoint values', () => {
  assert.equal(calculateCpcbSubIndex('pm25', 0), 0);
  assert.equal(calculateCpcbSubIndex('pm25', 30), 50);
  assert.equal(calculateCpcbSubIndex('pm25', 60), 100);
  assert.equal(calculateCpcbSubIndex('pm25', 90), 200);
  assert.equal(calculateCpcbSubIndex('pm25', 120), 300);
  assert.equal(calculateCpcbSubIndex('pm25', 250), 400);
  assert.equal(calculateCpcbSubIndex('pm25', 142.5), 317);

  assert.equal(calculateCpcbSubIndex('pm10', 238), 192);
  assert.equal(calculateCpcbSubIndex('co', 1.5), 75);
  assert.equal(calculateCpcbSubIndex('pm25', -5), null);
});

test('calculateCpcbAqi enforces minimum 3 pollutants and PM2.5/PM10 presence', () => {
  const onlyTwo = calculateCpcbAqi({ pm25: 100, pm10: 150 });
  assert.equal(onlyTwo.eligible, false);
  assert.equal(onlyTwo.aqi, null);

  const gasesOnly = calculateCpcbAqi({ no2: 50, o3: 60, so2: 20, co: 1.2 });
  assert.equal(gasesOnly.eligible, false);
  assert.equal(gasesOnly.aqi, null);

  const valid = calculateCpcbAqi({
    pm25: 142.5,
    pm10: 238,
    no2: 54.2,
    o3: 32.8,
    so2: 18.4,
    co: 1.9,
  });
  assert.equal(valid.eligible, true);
  assert.equal(valid.aqi, 317);
  assert.equal(valid.dominantPollutant, 'PM2.5');
  assert.equal(valid.category.labelEn, 'Very Poor');
});

test('classifyCpcbAqi maps official CPCB NAQI categories', () => {
  assert.equal(classifyCpcbAqi(45).labelEn, 'Good');
  assert.equal(classifyCpcbAqi(85).labelEn, 'Satisfactory');
  assert.equal(classifyCpcbAqi(160).labelEn, 'Moderately Polluted');
  assert.equal(classifyCpcbAqi(240).labelEn, 'Poor');
  assert.equal(classifyCpcbAqi(350).labelEn, 'Very Poor');
  assert.equal(classifyCpcbAqi(450).labelEn, 'Severe');
});
