// Offline component tests. Firestore, EmailJS, maps and React hooks are simulated;
// no production SDK or network request is loaded. Run: node --test tests/duplicacio.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const React = require('react');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/AppFinalFormulari.jsx'), 'utf8');
const compiled = transformSync(source + '\nexport { dataMadrid, ROUTE_ORIGIN, ROUTE_ORIGIN_TOLERANCE_METERS, clauRuta, rutaReutilitzable };', { loader: 'jsx', format: 'cjs' }).code;
const plain = (value) => JSON.parse(JSON.stringify(value));
const config = {
  responsables: ['Cap actual'], oficialsResponsables: ['Oficial actual'], oficials: ['Operari actual'],
  peons: [], eines: [], matricules: [], tasques: [],
  oficialsEmails: { 'Oficial actual': 'actual@example.test' },
  oficialsTelefons: { 'Oficial actual': '123456789' },
};
const original = {
  data: '2025-01-20', any: 2025, mes: 1, entorn: 'real',
  referenciaComunicat: 'CF-202501-0001', incidencia: 'legacy-ref',
  responsableBrigada: 'Cap antic', oficialResponsable: ['Oficial actual'],
  oficial: ['Operari antic'], peo: 'Peó antic', eines: ['Eina antiga'],
  matricula: '1234ABC', feines: 'Poda', ruta: 'Carrer primer; Carrer segon',
  observacions: 'Continuar demà', to_email: 'antic@example.test', telefon: '987654321',
  createdAt: 'old-created', updatedAt: 'old-updated', id: 'do-not-copy',
  estatPrivat: 'do-not-copy', duplicatDeId: 'ancestor', duplicatDeReferencia: 'ancestor-ref',
};
function harness({ params = { origenId: 'original' }, demo = false, data = original, emailSend, fetchRoute, failRead = false, failWrite = false, locationState = null, component = "AppFinalFormulari", componentProps = {}, capture, signedIn = false } = {}) {
  const cells = [], effects = [], timers = new Map(), writes = [], sends = [], alerts = [], navigations = [], requests = [];
  const docs = new Map([['comunicatsNova/original', plain(data)], ['configuracio_formulari/default', config]]);
  const storage = new Map();
  let index = 0, dirty = true, tree, timerId = 0, serial = 0, captures = 0, prints = 0;
  const pdf = [];
  const equal = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    ...React,
    useState(initial) {
      const i = index++;
      if (!cells[i]) cells[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [cells[i].value, (next) => {
        const value = typeof next === 'function' ? next(cells[i].value) : next;
        if (!Object.is(value, cells[i].value)) { cells[i].value = value; dirty = true; }
      }];
    },
    useRef(initial) { const i = index++; return (cells[i] ||= { current: initial }); },
    useMemo(fn, deps) { const i = index++; if (!cells[i] || !equal(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useEffect(fn, deps) {
      const i = index++;
      if (!cells[i] || !equal(cells[i].deps, deps)) {
        const old = cells[i]; cells[i] = { deps, cleanup: old?.cleanup };
        effects.push(() => { cells[i].cleanup?.(); cells[i].cleanup = fn(); });
      }
    },
  };
  const localStorage = { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) };
  function loadUtility(file) {
    const module = { exports: {} };
    vm.runInNewContext(transformSync(fs.readFileSync(path.join(root, 'src', file), 'utf8'), { format: 'cjs' }).code,
      { module, exports: module.exports, localStorage, console });
    return module.exports;
  }
  const demoModule = loadUtility('demo.js');
  if (demo) demoModule.saveDemoComunicatLocal({ ...plain(data), id: 'original', entorn: 'demo' });
  const snapshot = ref => ({ exists: () => docs.has(ref.path), data: () => docs.get(ref.path) });
  const save = (ref, value, merge) => {
    if (failWrite) throw new Error('Simulated persistence failure');
    writes.push({ path: ref.path, data: plain(value) });
    docs.set(ref.path, merge ? { ...docs.get(ref.path), ...plain(value) } : plain(value));
  };
  const firestore = {
    collection: (_db, name) => ({ path: name }),
    where: (field, _op, value) => ({ field, value }),
    query: (ref, ...conditions) => ({ ...ref, conditions }),
    getDocs: async ref => ({ docs: [...docs].filter(([key, data]) => key.startsWith(ref.path + '/') &&
      (ref.conditions || []).every(c => data[c.field] === c.value))
      .map(([key, value]) => ({ id: key.split('/')[1], data: () => value })) }),
    doc: (base, name, id) => name ? { path: `${name}/${id}`, id } : { path: `${base.path}/new-${++serial}`, id: `new-${serial}` },
    getDoc: async ref => { if (failRead && ref.path.startsWith('comunicatsNova/')) throw new Error('Denied'); return snapshot(ref); },
    setDoc: async (ref, value) => save(ref, value),
    updateDoc: async (ref, value) => save(ref, value, true),
    serverTimestamp: () => 'new-server-timestamp',
    runTransaction: async (_db, callback) => {
      const staged = [];
      const result = await callback({ get: async ref => snapshot(ref), set: (ref, value, options) => staged.push([ref, value, options?.merge]) });
      if (failWrite) throw new Error('Simulated transaction failure');
      staged.forEach(args => save(...args)); return result;
    },
  };
  const navigationOptions = [];
  const navigate = (target, options) => { navigations.push(target); navigationOptions.push(options); };
  const imports = {
    react: hooks, 'react-router-dom': { Link: "Link", BrowserRouter: "BrowserRouter", Routes: "Routes", Route: "Route", Navigate: "Navigate", useParams: () => params, useNavigate: () => navigate, useLocation: () => ({ state: locationState }) },
    'react-leaflet': Object.fromEntries(['MapContainer', 'TileLayer', 'Marker', 'Popup', 'Polyline'].map(k => [k, k])),
    leaflet: { icon: x => x, latLngBounds: x => x },
    'emailjs-com': { send: async (...args) => { sends.push(args[2].to_email); await emailSend?.(...args); } },
    html2canvas: async () => { captures++; if (capture) return capture(); return { toDataURL: () => 'data:image/jpeg;base64,current' }; },
    'firebase/firestore': firestore, './firebase': { db: {} }, './demo': demoModule,
    './llocsFeina': loadUtility('llocsFeina.js'), './ImpressioComunicat': () => null,
    './Home': () => null, './Login': () => null, './Database': () => null, './AppFinalFormulari': () => null,
    'firebase/auth': { getAuth: () => ({}), onAuthStateChanged: (_auth, cb) => {
      cb(signedIn ? { email: 'local@example.test' } : null); return () => {};
    } },
    jspdf: class { setFontSize() {} text(value) { pdf.push(value); } splitTextToSize(value) { return [value]; } save(name) { pdf.push(name); } },
  };
  const module = { exports: {} };
  vm.runInNewContext(component === "AppFinalFormulari" ? compiled : transformSync(
    fs.readFileSync(path.join(root, 'src', component + '.jsx'), 'utf8'), { loader: 'jsx', format: 'cjs' }).code, {
    module, exports: module.exports, React: hooks, localStorage, window: { print: () => prints++ }, require: name => {
      if (name.endsWith('.css')) return {};
      assert.ok(name in imports, `Unexpected dependency ${name}`); return imports[name];
    }, console: { log() {}, info() {}, warn() {}, error() {} }, Intl, Date, AbortController,
    setTimeout: (fn, ms) => { if (ms === 1200 || ms === 600) { Promise.resolve().then(fn); return 0; } timers.set(++timerId, { fn, ms }); return timerId; },
    clearTimeout: id => timers.delete(id), alert: message => alerts.push(message),
    fetch: async (...args) => { requests.push(args); return fetchRoute ? fetchRoute(...args) : Promise.reject(new Error('Offline route failure')); },
    document: { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {}, strokeRect() {} }), toDataURL: () => 'data:image/png;base64,placeholder' }) },
  });
  const Component = module.exports.default;
  function render() { index = 0; dirty = false; tree = Component({ isDemoMode: demo, ...componentProps }); effects.splice(0).forEach(fn => fn()); }
  async function settle() { for (let i = 0; i < 35; i++) { if (dirty) render(); await Promise.resolve(); } }
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(n => nodes(n ?? null));
    return [node, ...nodes(node.props?.children ?? null)];
  }
  const find = predicate => nodes().find(predicate);
  const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  const button = label => find(n => n.type === 'button' && text(n).trim() === label);
  const formData = () => find(n => n.props?.comunicat)?.props.comunicat;
  return {
    settle, writes, sends, docs, alerts, navigations, navigationOptions, requests, exports: module.exports, demoModule,
    nodes, find, button, formData, captures: () => captures, prints: () => prints, pdf,
    updateProps: async props => { componentProps = { ...componentProps, ...props }; dirty = true; await settle(); },
    change: async (predicate, value) => { find(predicate).props.onChange({ target: { value } }); await settle(); },
    submit: value => find(n => n.type === 'form').props.onSubmit({ preventDefault() {}, nativeEvent: { submitter: { value } } }),
    timers: async ms => { [...timers].filter(([, t]) => t.ms === ms).forEach(([id, t]) => { timers.delete(id); t.fn(); }); await settle(); },
  };
}
const created = h => h.writes.filter(w => w.path.startsWith('comunicatsNova/new-'));

test('duplicate normalizes old fields, preserves retired options, uses current contacts and Madrid date', async () => {
  const h = harness(); await h.settle(); const f = h.formData();
  assert.equal(f.data, h.exports.dataMadrid()); assert.deepEqual(plain(f.peo), ['Peó antic']);
  assert.deepEqual(plain(f.llocsFeina), ['Carrer primer', 'Carrer segon']);
  assert.equal(f.to_email, 'actual@example.test'); assert.equal(f.telefon, '123456789');
  assert.equal(f.referenciaComunicat, ''); assert.equal(f.incidencia, '');
  assert.equal(f.createdAt, undefined); assert.equal(f.estatPrivat, undefined);
  assert.ok(h.find(n => n.type === 'span' && n.props.children === 'Operari antic'));
  assert.ok(h.button('Desar nou comunicat')); assert.ok(h.button('Desar i enviar'));
});
test('save duplicate creates a fresh document and counter, leaves original intact, sends no email', async () => {
  const h = harness(); await h.settle(); const before = plain(h.docs.get('comunicatsNova/original'));
  await h.change(n => n.type === 'input' && n.props.type === 'date', '2027-01-01');
  await h.submit('desar');
  assert.equal(created(h).length, 1); const saved = created(h)[0].data;
  assert.deepEqual(h.docs.get('comunicatsNova/original'), before);
  assert.equal(saved.referenciaComunicat, 'CF-202701-0001'); assert.equal(saved.createdAt, 'new-server-timestamp');
  assert.equal(saved.updatedAt, 'new-server-timestamp'); assert.equal(saved.any, 2027); assert.equal(saved.mes, 1);
  assert.equal(saved.duplicatDeId, 'original'); assert.equal(saved.duplicatDeReferencia, original.referenciaComunicat);
  assert.equal(saved.id, undefined); assert.equal(saved.deleted, undefined); assert.equal(saved.estatPrivat, undefined);
  assert.equal(h.sends.length, 0); assert.deepEqual(h.navigations, ['/database']);
});
test('cancel creates no document or counter and sends nothing', async () => {
  const h = harness(); await h.settle(); h.button('Cancel·lar').props.onClick();
  assert.equal(h.writes.length, 0); assert.equal(h.sends.length, 0); assert.deepEqual(h.navigations, ['/database']);
});
test('Madrid handles midnight, month, year and summer time', () => {
  const { dataMadrid } = harness().exports;
  assert.equal(dataMadrid(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
  assert.equal(dataMadrid(new Date('2026-01-31T23:30:00Z')), '2026-02-01');
  assert.equal(dataMadrid(new Date('2026-07-31T22:30:00Z')), '2026-08-01');
  assert.equal(dataMadrid(new Date('2026-10-08T21:59:00Z')), '2026-10-08');
});
test('send duplicate handles double click and repeated submission once', async () => {
  const h = harness(); await h.settle();
  await Promise.all([h.submit('enviar'), h.submit('enviar')]); await h.submit('enviar');
  assert.equal(created(h).length, 1); assert.deepEqual(h.sends, ['actual@example.test']);
});
test('EmailJS partial failure retries only pending recipients, without any further write', async () => {
  let failed = false;
  const h = harness({ emailSend: async (_service, _template, data) => {
    if (data.to_email === 'second@example.test' && !failed) { failed = true; throw new Error('EmailJS unavailable'); }
  } });
  await h.settle();
  await h.change(n => n.props.placeholder === 'Email destinatari', 'first@example.test, second@example.test');
  await h.submit('enviar'); await h.settle();
  assert.equal(created(h).length, 1); const count = h.writes.length;
  assert.ok(h.button('Reintentar enviament pendent')); assert.equal(h.find(n => n.type === 'fieldset').props.disabled, true);
  await h.button('Reintentar enviament pendent').props.onClick();
  assert.equal(h.writes.length, count);
  assert.deepEqual(h.sends, ['first@example.test', 'second@example.test', 'second@example.test']);
  assert.deepEqual(h.navigations, ['/editar/new-1', '/database']);
});
test('invalid recipient is editable before save; save without email remains available', async () => {
  const h = harness(); await h.settle(); await h.change(n => n.props.placeholder === 'Email destinatari', 'bad');
  await h.submit('enviar'); assert.equal(h.writes.length, 0);
  await h.submit('desar'); assert.equal(created(h).length, 1); assert.equal(h.sends.length, 0);
});
test('persistence failure does not call email', async () => {
  const h = harness({ failWrite: true }); await h.settle(); await h.submit('enviar');
  assert.equal(h.sends.length, 0); assert.equal(h.writes.length, 0);
});
for (const [name, options] of [
  ['missing', { params: { origenId: 'missing' } }], ['deleted', { data: { ...original, deleted: true } }],
  ['wrong environment', { data: { ...original, entorn: 'demo' } }], ['permission denied', { failRead: true }],
]) test(`rejects ${name} source`, async () => {
  const h = harness(options); await h.settle(); await h.submit('desar');
  assert.equal(h.writes.length, 0); assert.equal(h.find(n => n.type === 'fieldset').props.disabled, true);
});
test('save before source loading finishes is ignored', async () => {
  const h = harness(); const settling = h.settle(); await h.submit('desar'); await settling;
  assert.equal(h.writes.length, 0);
});
test('regular create still sends email', async () => {
  const h = harness({ params: {} }); await h.settle();
  await h.change(n => n.props.placeholder === 'Email destinatari', 'new@example.test');
  await h.submit('desar'); assert.equal(created(h).length, 1); assert.deepEqual(h.sends, ['new@example.test']);
});
for (const action of ['desar', 'reenviar']) test(`edit ${action} preserves identity and provenance`, async () => {
  const h = harness({ params: { id: 'original' } }); await h.settle(); await h.submit(action);
  assert.equal(created(h).length, 0); assert.equal(h.writes.length, 1);
  const saved = h.docs.get('comunicatsNova/original');
  assert.equal(saved.createdAt, 'old-created'); assert.equal(saved.referenciaComunicat, original.referenciaComunicat);
  assert.equal(saved.duplicatDeId, 'ancestor'); assert.equal(h.sends.length, action === 'reenviar' ? 1 : 0);
});
test('demo duplicate and later edit retain provenance and original, without Firestore or EmailJS', async () => {
  const h = harness({ demo: true }); await h.settle(); await h.submit('enviar');
  const docs = plain(h.demoModule.getDemoComunicatsLocals());
  assert.equal(docs.length, 2); const copy = docs.find(d => d.id !== 'original');
  assert.equal(copy.duplicatDeId, 'original'); assert.equal(copy.entorn, 'demo');
  assert.notEqual(copy.createdAt, original.createdAt); assert.equal(h.writes.length, 0); assert.equal(h.sends.length, 0);
  const edit = harness({ demo: true, params: { id: 'original' }, data: copy });
  await edit.settle(); await edit.submit('desar');
  const saved = edit.demoModule.getDemoComunicatLocal('original');
  assert.equal(saved.duplicatDeId, 'original'); assert.equal(saved.createdAt, copy.createdAt);
});
test('route cache requires matching order, origin, profile, completeness and valid coordinates', () => {
  const { ROUTE_ORIGIN, ROUTE_ORIGIN_TOLERANCE_METERS, clauRuta, rutaReutilitzable } = harness().exports;
  const places = ['Carrer primer', 'Carrer segon'];
  assert.deepEqual(plain(ROUTE_ORIGIN), [39.4851659, 2.8859026]);
  assert.equal(ROUTE_ORIGIN_TOLERANCE_METERS, 250);
  const data = { rutaClau: clauRuta(places), rutaCompleta: true, rutaCoords: [{ lat: 39.4852, lng: 2.8859 }, { lat: 39.5, lng: 2.9 }] };
  assert.equal(rutaReutilitzable(data, places), true);
  assert.equal(rutaReutilitzable(data, [...places].reverse()), false);
  assert.equal(rutaReutilitzable({ ...data, rutaCompleta: false }, places), false);
  assert.equal(rutaReutilitzable({ ...data, rutaClau: undefined }, places), false);
  for (const key of [data.rutaClau.replace('driving-car', 'walking'), data.rutaClau.replace('39.4851659', '40')])
    assert.equal(rutaReutilitzable({ ...data, rutaClau: key }, places), false);
  assert.equal(rutaReutilitzable({ ...data, rutaCoords: [{ lat: NaN, lng: 3 }, { lat: 95, lng: 3 }] }, places), false);
  assert.equal(rutaReutilitzable({ ...data, rutaCoords: [{ lat: 39.4924, lng: 2.89174 }, ...data.rutaCoords.slice(1)] }, places), false);
});
test('map, route key and OpenRouteService request use the centralized origin in their required coordinate order', async () => {
  const h = harness({ fetchRoute: async url => url.includes('nominatim')
    ? { ok: true, json: async () => [{ lat: '39.49', lon: '2.88' }] }
    : { ok: true, json: async () => ({ features: [{ geometry: { coordinates: [[2.8859, 39.4852], [2.88, 39.49]] } }] }) } });
  await h.settle();
  assert.deepEqual(plain(h.find(n => n.type === 'MapContainer').props.center), [39.4851659, 2.8859026]);
  assert.deepEqual(plain(h.find(n => n.type === 'Marker').props.position), [39.4851659, 2.8859026]);
  await h.timers(700);
  const request = h.requests.find(([url]) => url.includes('openrouteservice'));
  assert.deepEqual(plain(JSON.parse(request[1].body).coordinates[0]), [2.8859026, 39.4851659]);
  const key = JSON.parse(h.exports.clauRuta(['Carrer primer', 'Carrer segon']));
  assert.deepEqual(plain(key.origen), [39.4851659, 2.8859026]);
});
test('route markers use Leaflet pin-tip anchors and a recovered route restores destination markers and fits bounds', async () => {
  const key = harness().exports.clauRuta(['Carrer primer', 'Carrer segon']);
  const h = harness({ data: { ...original, rutaClau: key, rutaCompleta: true,
    rutaCoords: [{ lat: 39.4852, lng: 2.8859 }, { lat: 39.49, lng: 2.88 }] },
    fetchRoute: async () => ({ ok: true, json: async () => [{ lat: '39.49', lon: '2.88' }] }) });
  const bounds = [];
  await h.settle();
  const map = h.find(n => n.type === 'MapContainer');
  map.props.whenReady({ target: { fitBounds: value => bounds.push(value), invalidateSize() {}, getContainer() {} } });
  await h.settle();
  const markers = h.nodes().filter(n => n.type === 'Marker');
  assert.equal(markers.length, 3);
  assert.deepEqual(plain(markers[0].props.icon.iconAnchor), [12, 41]);
  assert.deepEqual(plain(markers[1].props.icon.iconAnchor), [12, 41]);
  assert.ok(bounds.length > 0);
  assert.ok(bounds.at(-1).some(point => point[0] === 39.4852 && point[1] === 2.8859));
});
test('verified route is reused without fetch and invalidates immediately on destination edit', async () => {
  const key = harness().exports.clauRuta(['Carrer primer', 'Carrer segon']);
  const h = harness({ data: { ...original, rutaClau: key, rutaCompleta: true,
    rutaCoords: [{ lat: 39.4852, lng: 2.8859 }, { lat: 39.5, lng: 2.9 }], mapa: 'old-image' } });
  await h.settle(); await h.timers(700); assert.equal(h.requests.some(([url]) => url.includes('openrouteservice')), false);
  assert.ok(h.find(n => n.type === 'Polyline'));
  await h.change(n => n.type === 'input' && n.props.value === 'Carrer primer', 'Nou carrer');
  assert.equal(h.find(n => n.type === 'Polyline'), undefined);
  await h.submit('desar');
  assert.equal(created(h)[0].data.mapa, ''); assert.deepEqual(created(h)[0].data.rutaCoords, []);
});
test('legacy route recalculates; failure permits save without stale map', async () => {
  const h = harness({ data: { ...original, rutaCoords: [{ lat: 39, lng: 3 }, { lat: 40, lng: 3 }], mapa: 'old' } });
  await h.settle(); await h.timers(700); assert.ok(h.requests.length > 0);
  await h.submit('desar'); assert.equal(created(h)[0].data.mapa, ''); assert.deepEqual(created(h)[0].data.rutaCoords, []);
});
test('late route response cannot restore the old destination', async () => {
  let resolveDirections;
  const h = harness({ fetchRoute: async url => url.includes('nominatim')
    ? { ok: true, json: async () => [{ lat: '39.5', lon: '2.9' }] }
    : new Promise(resolve => { resolveDirections = resolve; }) });
  await h.settle(); await h.timers(700); assert.ok(resolveDirections);
  await h.change(n => n.type === 'input' && n.props.value === 'Carrer primer', 'Nou carrer');
  resolveDirections({ ok: true, json: async () => ({ features: [{ geometry: { coordinates: [[2.89, 39.49], [2.9, 39.5]] } }] }) });
  await h.settle(); assert.equal(h.find(n => n.type === 'Polyline'), undefined);
  await h.submit('desar'); assert.equal(created(h)[0].data.rutaClau, '');
});

test('reload after an email failure resumes against the saved ID and retains successful recipients', async () => {
  const failed = harness({ emailSend: async (_service, _template, data) => {
    if (data.to_email === 'second@example.test') throw new Error('EmailJS unavailable');
  } });
  await failed.settle();
  await failed.change(n => n.props.placeholder === 'Email destinatari', 'first@example.test, second@example.test');
  await failed.submit('enviar');
  const options = failed.navigationOptions.at(-1);
  assert.equal(options.replace, true);
  const saved = created(failed)[0].data;
  const reloaded = harness({ params: { id: 'new-1' }, locationState: options.state });
  reloaded.docs.set('comunicatsNova/new-1', saved);
  await reloaded.settle();
  assert.ok(reloaded.button('Reintentar enviament pendent'));
  await reloaded.button('Reintentar enviament pendent').props.onClick();
  assert.equal(reloaded.writes.length, 0);
  assert.deepEqual(reloaded.sends, ['second@example.test']);
  assert.equal(reloaded.navigationOptions.at(-1).replace, true);
});

test('valid route is captured from current map and persisted with verification metadata', async () => {
  const key = harness().exports.clauRuta(['Carrer primer', 'Carrer segon']);
  const h = harness({ data: { ...original, rutaClau: key, rutaCompleta: true,
    rutaCoords: [{ lat: 39.4852, lng: 2.8859 }, { lat: 39.5, lng: 2.9 }], mapa: 'old-image' } });
  await h.settle();
  h.find(n => n.type === 'MapContainer').props.whenReady({ target: { fitBounds() {}, invalidateSize() {}, getContainer() {} } });
  await h.settle(); await h.submit('desar');
  const saved = created(h)[0].data;
  assert.equal(h.captures(), 1); assert.equal(saved.mapa, 'data:image/jpeg;base64,current');
  assert.equal(saved.rutaClau, key); assert.equal(saved.rutaCompleta, true); assert.equal(saved.rutaCoords.length, 2);
});
test('printing discards a map capture if destinations change during capture', async () => {
  let handlePrint, finish;
  const h = harness({ component: 'ImpressioComunicat',
    componentProps: { comunicat: { ...original, oficial: [], peo: [], eines: [], feines: [] }, mapaClau: 'A',
      mapaRef: { current: { getContainer: () => ({}) } }, onPrintReady: fn => { handlePrint = fn; } },
    capture: () => new Promise(resolve => { finish = resolve; }),
  });
  await h.settle(); const printing = handlePrint();
  await h.updateProps({ mapaClau: 'B', mapaNoDisponible: true });
  finish({ toDataURL: () => 'stale-image' }); await printing; await h.settle(); await h.timers(500);
  assert.equal(h.prints(), 0); assert.equal(h.find(n => n.type === 'img' && n.props.src === 'stale-image'), undefined);
  await handlePrint(); await h.timers(500); assert.equal(h.prints(), 1);
});
test('history keeps filtering, preview and PDF, and duplicates by the actual document ID', async () => {
  const now = new Date();
  const h = harness({ component: 'Database', data: { ...original, any: now.getFullYear(), mes: now.getMonth() + 1 } });
  await h.settle();
  assert.ok(h.button('Duplicar comunicat'));
  h.button('Duplicar comunicat').props.onClick(); assert.deepEqual(h.navigations, ['/duplicar/original']);
  h.find(n => n.props.title === 'Veure').props.onClick(); await h.settle();
  assert.ok(h.button('📄 Descarregar PDF')); h.button('📄 Descarregar PDF').props.onClick();
  assert.ok(h.pdf.includes('comunicat_2025-01-20.pdf'));
  assert.ok(h.pdf.flat().includes('Referència: CF-202501-0001'));
  assert.ok(h.nodes().some(n => n.type === 'small' && n.props.children.includes('ancestor-ref')));
  await h.change(n => n.props.placeholder === '🔎 Escriu per cercar comunicats...', 'no-matching-record');
  assert.equal(h.button('Duplicar comunicat'), undefined);
  await h.change(n => n.props.placeholder === '🔎 Escriu per cercar comunicats...', '2025-01-20');
  assert.ok(h.button('Duplicar comunicat'));
});
for (const signedIn of [false, true]) test(`duplication route respects authentication: ${signedIn}`, async () => {
  const h = harness({ component: 'App', signedIn }); await h.settle();
  const route = h.find(n => n.props.path === '/duplicar/:origenId'); assert.ok(route);
  assert.equal(route.props.element.type === 'Navigate', !signedIn);
});

test('retired selections can be unchecked and selected again without changing global catalogues', async () => {
  const h = harness(); await h.settle();
  const option = () => h.nodes().find(n => n.type === 'label' && h.nodes(n).some(child => child.type === 'span' && child.props.children === 'Operari antic'));
  const checkbox = () => h.nodes(option()).find(n => n.type === 'input');
  checkbox().props.onChange(); await h.settle();
  assert.ok(option()); assert.equal(checkbox().props.checked, false);
  checkbox().props.onChange(); await h.settle(); assert.equal(checkbox().props.checked, true);
  assert.equal(h.writes.length, 0);
});
