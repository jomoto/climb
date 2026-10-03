import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as model from '../model.js';

// Exercise the real app adapter and serialization with a minimal rendering surface.
// The numerical engine is tested independently; this catches disconnected inputs.
function app() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      const item = { textContent: '', innerHTML: '', value: '', disabled: false,
        classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, querySelectorAll() { return []; } };
      item.closest = () => item;
      elements.set(id, item);
    }
    return elements.get(id);
  };
  const context = vm.createContext({ ...model, structuredClone, URLSearchParams, AbortController,
    document: { addEventListener() {}, getElementById: element }, window: {},
    setTimeout() { return 0; }, clearTimeout() {} });
  const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8').replace(/^import .*?;\n/, '');
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  run(`initStateFromLibrary();
    for (const name of ['renderTripControls','refreshAssumptionUi','updateMapSelectionLabel','buildManualSelectOptions','refreshRechargeVisibility','refreshSolarPrecisionUi','updateLoadCard']) eval(name + ' = () => {}');
    Object.assign(uiSetters, {solarWatts(){},solarEfficiency(){},altPower(){},driveHoursDay(){},autonomyDays(){},installedAh(){}});
    addCustomLoad = load => { DEVICE_LIBRARY.push({id:load.id,name:load.name,watts:load.watts,dutyFactor:1}); state.loads[load.id] = load; };`);
  return { run, element, plain: code => JSON.parse(JSON.stringify(run(code))) };
}

test('manual battery and removed chargers drive actual recharge and reserve results', () => {
  const { run, element } = app();
  run(`state.componentMode='manual'; Object.assign(state.manualComponents,{batteryAh:'100',solarWatts:'0',alternatorWatts:'0'}); calculate();`);
  assert.equal(element('dailyRecharge').textContent, '0 Wh');
  assert.match(element('componentBattery').textContent, /^100 Ah/);
  assert.doesNotMatch(element('runtimeWithRecharge').textContent, /Continuous|Not within/);
  assert.match(element('tripVerdict').textContent, /runs out|Reserve/);
});
test('all-DC setup needs no inverter; a removed inverter with AC loads reports a fault', () => {
  const { run, element } = app();
  run(`Object.values(state.loads).forEach(load=>load.powerPath='dc'); calculate();`);
  assert.equal(element('componentInverter').textContent, 'No inverter');
  run(`state.loads.laptop.powerPath='ac'; state.componentMode='manual'; state.manualComponents.inverterWatts='0'; calculate();`);
  assert.equal(element('tripVerdict').textContent, 'Equipment needs attention');
});
test('battery temperature is independent of fridge ambient temperature', () => {
  const { run } = app();
  run('calculate();');
  const capacity = run('lastPlan.trip.capacityWh');
  run('state.fridgeAverageTempF=15; calculate();');
  assert.equal(run('lastPlan.trip.capacityWh'), capacity);
  assert.equal(run('lastPlan.trip.chargeAllowed'), true);
});
test('custom watts, duty, custom appliances, manual sizes, and trip schedule survive export/import', () => {
  const { run, plain } = app();
  run(`state.loads.fridge.customWatts=55; state.loads.laptop.customWatts=120;
    state.loads.induction.customDutyFactor=0.8; state.trip.days=3; ensureTripSchedule(); state.trip.schedule[1].driveHours=2.5;
    state.componentMode='manual'; state.manualComponents.batteryAh='230';
    addCustomLoad({id:'custom-pump',name:'Water pump',watts:30,enabled:true,hours:0.5,powerPath:'dc',quantity:1,startHour:18,measuredWh:null,customWatts:null});
    var saved = buildSettingsPayload(); state.loads.fridge.customWatts=null; state.loads.laptop.customWatts=null;
    state.trip.schedule[1].driveHours=0; state.manualComponents.batteryAh='auto'; applySettingsFromPayload(saved);`);
  assert.equal(run('state.loads.fridge.customWatts'), 55);
  assert.equal(run('state.loads.laptop.customWatts'), 120);
  assert.equal(run('state.loads.induction.customDutyFactor'), 0.8);
  assert.equal(run('state.trip.schedule[1].driveHours'), 2.5);
  assert.equal(run('state.manualComponents.batteryAh'), '230');
  assert.equal(run(`state.loads['custom-pump'].hours`), 0.5);
  assert.deepEqual(plain('buildSettingsPayload()'), plain('saved'));
});
test('invalid settings are rejected without partially changing the active plan', () => {
  const { run, plain } = app();
  const before = plain('buildSettingsPayload()');
  assert.throws(() => run(`applySettingsFromPayload({assumptions:{ledWatts:30,fridgeDutyFactor:'bad'}});`));
  assert.deepEqual(plain('buildSettingsPayload()'), before);
});
test('legacy version 1 settings remain compatible', () => {
  const { run } = app();
  const old = fs.readFileSync(new URL('./fixtures/v1-plan.json', import.meta.url), 'utf8');
  run(`applySettingsFromPayload(${old});`);
  assert.equal(run('state.installedAh'), 400);
  assert.equal(run('state.loads.laptop.hours'), 3);
});
test('valid zero solar irradiation is used instead of a sunny fallback', () => {
  const { run } = app();
  run(`Object.assign(state.solarPrecision,{enabled:true,hasPinned:true,monthlySunHours:Array(12).fill(0),status:'ready'});`);
  assert.equal(run('getSolarSunHoursModel().adjustedHours'), 0);
  assert.equal(run('getSolarSunHoursModel().usingPvWatts'), true);
});
test('missing climate samples do not turn into freezing temperatures', () => {
  const { run } = app();
  assert.throws(() => run(`parseFridgeClimatePayload({daily:{time:Array(10).fill('2025-07-01'),temperature_2m_max:Array(10).fill(null),temperature_2m_min:Array(10).fill(null)}},7,2016,2025);`));
});
test('exported and shared plans exclude the user API key', () => {
  const { run } = app();
  run(`state.assumptions.pvWattsApiKey='private-key';`);
  assert.equal(run('buildSettingsPayload().assumptions.pvWattsApiKey'), 'DEMO_KEY');
});
