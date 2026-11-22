'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appPath = path.join(__dirname, '..', '..', 'js', 'app.js');
const src = fs.readFileSync(appPath, 'utf8');

function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function plus(n) { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function disp(d) { return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }

const fakeData = {
  members: [
    { id: 'M1', name: 'Overdue Ola', plan: 'monthly', startDate: iso(plus(-40)), endDate: iso(plus(-10)), fee: 1000, phone: '9900000001' },
    { id: 'M2', name: 'Ending Eve', plan: 'monthly', startDate: iso(plus(-28)), endDate: iso(plus(2)), fee: 1000, phone: '9900000002' },
    { id: 'M3', name: 'Paid Pat', plan: 'yearly', startDate: iso(plus(-100)), endDate: iso(plus(265)), fee: 9000, phone: '9900000003' }
  ],
  invoices: [
    { invoiceNo: 'INV-001', memberId: 'M1', amount: 1000, issueDate: iso(plus(-20)), dueDate: iso(plus(-10)), status: 'pending', paidDate: null },
    { invoiceNo: 'INV-002', memberId: 'M1', amount: 2000, issueDate: iso(plus(-12)), dueDate: iso(plus(-5)), status: 'pending', paidDate: null },
    { invoiceNo: 'INV-003', memberId: 'M3', amount: 9000, issueDate: iso(plus(-30)), dueDate: iso(plus(-20)), status: 'paid', paidDate: iso(plus(-21)) },
    { invoiceNo: 'INV-004', memberId: 'GHOST', amount: 500, issueDate: iso(plus(-20)), dueDate: iso(plus(-10)), status: 'pending', paidDate: null }
  ],
  expenses: [],
  settings: { renewalRate: 0.7, openingCashBalance: 50000 }
};

class FakeEl {
  constructor(tag) {
    this.tagName = tag; this.children = []; this._text = ''; this.attrs = {};
    this.hidden = false; this.id = ''; this.className = ''; this.listeners = {};
    this.style = {}; this.value = ''; this.options = []; this.selectedIndex = -1;
    const classes = new Set(); const self = this;
    this.classList = {
      toggle(c, force) { const on = force === undefined ? !classes.has(c) : !!force; on ? classes.add(c) : classes.delete(c); return on; },
      add(c) { classes.add(c); }, remove(c) { classes.delete(c); }, contains(c) { return classes.has(c); }
    };
  }
  get textContent() { return this.children.length ? this._text + this.children.map(c => c.textContent).join('') : this._text; }
  set textContent(v) { this.children = []; this._text = String(v); }
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
  removeEventListener() {}
  select() {} setSelectionRange() {} focus() {} reset() {}
}

const byId = {};
function getEl(id) {
  if (!byId[id]) { const e = new FakeEl('div'); e.id = id; byId[id] = e; }
  return byId[id];
}
const sectionIds = ['members', 'invoices-expenses', 'dashboard', 'reminders', 'forecast'];
const sections = sectionIds.map(id => { const s = getEl(id); s.className = 'tab-section'; return s; });
const tabs = sectionIds.map(id => { const t = new FakeEl('button'); t.setAttribute('data-target', id); t.className = 'tab'; return t; });

const storageMap = new Map([['gymkhata', JSON.stringify(fakeData)]]);
const localStorage = {
  getItem: k => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: k => storageMap.delete(k)
};
const document = {
  readyState: 'complete',
  body: new FakeEl('body'),
  createElement: tag => new FakeEl(tag),
  getElementById: getEl,
  querySelectorAll: sel => (sel === '.tab[data-target]' ? tabs : sel === '.tab-section' ? sections : []),
  addEventListener() {},
  execCommand: () => false
};
const window = { localStorage };
window.window = window;
const ctx = vm.createContext({ window, document, navigator: {}, console, setTimeout, confirm: () => false });
vm.runInContext(src, ctx, { filename: appPath });

function openTab(id) {
  const tab = tabs.find(t => t.getAttribute('data-target') === id);
  tab.listeners.click[0]({ currentTarget: tab });
}
function cards(listEl) { return listEl.children; }
function textOf(el, cls) { return el.children.find(c => c.className === cls).textContent; }

let failures = 0;
function check(label, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail !== undefined ? ' :: ' + detail : ''));
  if (!ok) failures++;
}

try {
  openTab('reminders');
  const payEl = getEl('reminders-payment-list');
  const renEl = getEl('reminders-renewal-list');
  const pay = cards(payEl);
  const ren = cards(renEl);

  check('payment list has exactly 1 card', pay.length === 1, 'count=' + pay.length);
  const pc = pay[0];
  const pName = pc.children[0].children[0].textContent;
  const pReason = pc.children[0].children[1].textContent;
  check('payment card name', pName === 'Overdue Ola', JSON.stringify(pName));
  check('payment card reason (sums only overdue 1000+2000, ignores paid/ghost)', pReason === 'Overdue by 10 days, Rs 3,000', JSON.stringify(pReason));

  const dueOld = disp(plus(-10));
  const expectHi = 'Namaste Overdue Ola ji, aapki Rs 3,000 ki fees ' + dueOld + ' se 10 din se baaki hai. Kripya jaldi jama kar dein. Dhanyavaad!';
  const expectEn = 'Hello Overdue Ola, your fee of Rs 3,000 has been pending since ' + dueOld + ' (10 days overdue). Please pay at your earliest convenience. Thank you!';
  const hiMsg = textOf(pc, 'reminder-message');
  check('payment Hindi message text', hiMsg === expectHi, JSON.stringify(hiMsg));
  pc.children[1].children[1].listeners.click[0]();
  const enMsg = textOf(pc, 'reminder-message');
  check('payment English message text (after clicking English)', enMsg === expectEn, JSON.stringify(enMsg));

  check('renewal list has exactly 1 card', ren.length === 1, 'count=' + ren.length);
  const rc = ren[0];
  check('renewal card name', rc.children[0].children[0].textContent === 'Ending Eve', JSON.stringify(rc.children[0].children[0].textContent));
  check('renewal card reason "Plan ends in 2 days"', rc.children[0].children[1].textContent === 'Plan ends in 2 days', JSON.stringify(rc.children[0].children[1].textContent));
  const expectRenHi = 'Namaste Ending Eve ji, aapka monthly plan 2 din mein khatm ho raha hai (' + disp(plus(2)) + '). Renewal fees Rs 1,000 hai. Renew karne ke liye kripya sampark karein. Dhanyavaad!';
  check('renewal Hindi message text', textOf(rc, 'reminder-message') === expectRenHi, JSON.stringify(textOf(rc, 'reminder-message')));

  check('reminders section visible after tab open', getEl('reminders').hidden === false);

  openTab('reminders');
  check('re-opening tab does not duplicate cards', cards(payEl).length === 1 && cards(renEl).length === 1,
    'pay=' + cards(payEl).length + ' ren=' + cards(renEl).length);
} catch (e) {
  console.log('THREW: ' + (e && e.stack));
  failures++;
}
console.log(failures === 0 ? 'RESULT: ALL PASS' : 'RESULT: ' + failures + ' FAILURE(S)');
process.exitCode = failures === 0 ? 0 : 1;

