/* GymKhata - all front-end logic in one file (fake data only, no backend) */

(function () {
  "use strict";

  var STORAGE_KEY = "gymkhata";
  var storage = null;
  var data = null;
  var FEES = { "monthly": 1000, "3 months": 2700, "yearly": 9000 };
  var DURATION_DAYS = { "monthly": 30, "3 months": 90, "yearly": 365 };
  var PLANS = ["monthly", "3 months", "yearly"];

  var NAMES = [
    "Rahul Sharma", "Priya Nair", "Amit Verma", "Sneha Iyer", "Vikram Singh",
    "Anjali Rao", "Karan Mehta", "Pooja Patel", "Arjun Reddy", "Meera Joshi",
    "Rohan Gupta", "Divya Menon", "Suresh Kumar", "Kavya Pillai", "Nikhil Jain",
    "Ritu Chauhan", "Manish Tiwari", "Lakshmi Das"
  ];

  // Days from today to each member's endDate. The first 5 are expiring
  // within 0..7 days (inclusive); the rest are past or beyond 7 days.
  var END_OFFSETS = [
    0, 2, 4, 6, 7,
    -60, -45, -30, -20, -12, -9, -3,
    10, 14, 21, 30, 60, 90
  ];

  /* ---------- date helpers ---------- */

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function toISODate(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function addDays(date, days) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + days);
    return d;
  }

  function todayMidnight() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /* ---------- sample data ---------- */

  function buildSampleData() {
    var today = todayMidnight();
    var members = [];
    var invoices = [];

    for (var i = 0; i < 18; i++) {
      var id = "M" + pad2(i + 1);
      var plan = PLANS[i % 3];
      var endDate = addDays(today, END_OFFSETS[i]);
      var startDate = addDays(endDate, -DURATION_DAYS[plan]);
      var fee = FEES[plan];

      members.push({
        id: id,
        name: NAMES[i],
        plan: plan,
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
        fee: fee,
        phone: "99000000" + pad2(i + 1)
      });

      // One invoice per member; categories cycle paid / pending-future / overdue.
      var invoiceNo = "INV-" + String(i + 1).padStart(3, "0");
      var issueDate, dueDate, status, paidDate;
      var category = i % 3;

      if (category === 0) {
        // Paid
        issueDate = startDate;
        dueDate = addDays(startDate, 7);
        status = "paid";
        paidDate = toISODate(addDays(startDate, 1));
      } else if (category === 1) {
        // Pending, due in the future
        issueDate = addDays(today, -2);
        dueDate = addDays(today, 5);
        status = "pending";
        paidDate = null;
      } else {
        // Pending, overdue
        issueDate = addDays(today, -20);
        dueDate = addDays(today, -10);
        status = "pending";
        paidDate = null;
      }

      invoices.push({
        invoiceNo: invoiceNo,
        memberId: id,
        amount: fee,
        issueDate: toISODate(issueDate),
        dueDate: toISODate(dueDate),
        status: status,
        paidDate: paidDate
      });
    }

    var firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var fifthOfMonth = new Date(today.getFullYear(), today.getMonth(), 5);

    var expenses = [
      { id: "E01", name: "Rent", amount: 25000, dueDate: toISODate(firstOfMonth), repeatsMonthly: true },
      { id: "E02", name: "Electricity", amount: 6000, dueDate: toISODate(addDays(today, 3)), repeatsMonthly: true },
      { id: "E03", name: "Trainer salary", amount: 18000, dueDate: toISODate(fifthOfMonth), repeatsMonthly: true }
    ];

    return {
      members: members,
      invoices: invoices,
      expenses: expenses,
      settings: { renewalRate: 0.7, openingCashBalance: 50000 }
    };
  }

  /* ---------- storage ---------- */

  function getStorage() {
    try {
      var s = window.localStorage;
      if (!s) return null;
      // Probe: some browsers throw on access or on write.
      var probe = "__gymkhata_probe__";
      s.setItem(probe, "1");
      s.removeItem(probe);
      return s;
    } catch (e) {
      return null;
    }
  }

  function isValidData(obj) {
    return obj !== null &&
      typeof obj === "object" &&
      Array.isArray(obj.members) &&
      Array.isArray(obj.invoices) &&
      Array.isArray(obj.expenses) &&
      obj.settings !== null && typeof obj.settings === "object";
  }

  function loadData() {
    var storage = getStorage();

    if (!storage) {
      // localStorage unavailable: seed in memory only.
      return buildSampleData();
    }

    var raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (e) {
      return buildSampleData();
    }

    if (raw === null) {
      // First load: seed and save.
      var seeded = buildSampleData();
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      } catch (e) {
        // Ignore write failure; keep the in-memory copy.
      }
      return seeded;
    }

    try {
      var parsed = JSON.parse(raw);
      if (isValidData(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Corrupt JSON falls through to in-memory seed below.
    }
    // Corrupt data: do not overwrite the stored value; use in-memory seed.
    return buildSampleData();
  }

  /* ---------- rendering ---------- */

  function isExpiringSoon(member, today) {
    var end = member.endDate;
    var todayStr = toISODate(today);
    var limitStr = toISODate(addDays(today, 7));
    return end >= todayStr && end <= limitStr;
  }

  function makeDetailRow(dl, label, value) {
    var dt = document.createElement("dt");
    dt.textContent = label;
    var dd = document.createElement("dd");
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  function buildMemberCard(member, expiringSoon) {
    var li = document.createElement("li");
    li.className = "member-card";

    var header = document.createElement("div");
    header.className = "member-card-header";

    var name = document.createElement("h3");
    name.className = "member-name";
    name.textContent = member.name;
    header.appendChild(name);

    if (expiringSoon) {
      var badge = document.createElement("span");
      badge.className = "badge badge-expiring";
      badge.textContent = "Expiring soon";
      header.appendChild(badge);
    }

    li.appendChild(header);

    var dl = document.createElement("dl");
    dl.className = "member-details";
    makeDetailRow(dl, "Plan", member.plan);
    makeDetailRow(dl, "Start", member.startDate);
    makeDetailRow(dl, "End", member.endDate);
    makeDetailRow(dl, "Fee", String(member.fee));
    makeDetailRow(dl, "Phone", member.phone);
    li.appendChild(dl);

    return li;
  }

  function renderMembers(data) {
    var list = document.getElementById("member-list");
    if (!list) return;

    list.textContent = "";
    var today = todayMidnight();

    if (!data.members.length) {
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "No members yet.";
      list.appendChild(empty);
      return;
    }

    data.members.forEach(function (member) {
      list.appendChild(buildMemberCard(member, isExpiringSoon(member, today)));
    });
  }

  /* ---------- tabs ---------- */

  function setupTabs() {
    var tabs = document.querySelectorAll(".tab[data-target]");
    var sections = document.querySelectorAll(".tab-section");

    function showSection(targetId) {
      for (var i = 0; i < sections.length; i++) {
        sections[i].hidden = sections[i].id !== targetId;
      }
      for (var j = 0; j < tabs.length; j++) {
        var active = tabs[j].getAttribute("data-target") === targetId;
        tabs[j].classList.toggle("is-active", active);
        tabs[j].setAttribute("aria-selected", active ? "true" : "false");
      }
    }

    for (var k = 0; k < tabs.length; k++) {
      tabs[k].addEventListener("click", function (event) {
        showSection(event.currentTarget.getAttribute("data-target"));
      });
    }
  }

  /* ---------- formatting helpers ---------- */

  function formatRs(amount) {
    return "Rs " + String(Math.round(Number(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function parseISODate(str) {
    if (!str) return null;
    var parts = str.split("-");
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    return new Date(y, m - 1, d);
  }

  function daysBetween(fromDate, toDate) {
    var from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    var to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    return Math.round((to - from) / 86400000);
  }


  /* ---------- data access ---------- */

  function saveData() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Ignore write failure; data stays in memory for this session.
    }
  }

  function findMember(memberId) {
    for (var i = 0; i < data.members.length; i++) {
      if (data.members[i].id === memberId) return data.members[i];
    }
    return null;
  }

  function findInvoice(invoiceNo) {
    for (var i = 0; i < data.invoices.length; i++) {
      if (data.invoices[i].invoiceNo === invoiceNo) return data.invoices[i];
    }
    return null;
  }

  function numericSuffix(str) {
    var m = /(\d+)$/.exec(String(str));
    return m ? parseInt(m[1], 10) : 0;
  }

  function nextInvoiceNo() {
    var max = 0;
    for (var i = 0; i < data.invoices.length; i++) {
      max = Math.max(max, numericSuffix(data.invoices[i].invoiceNo));
    }
    return "INV-" + String(max + 1).padStart(3, "0");
  }

  function nextExpenseId() {
    var max = 0;
    for (var i = 0; i < data.expenses.length; i++) {
      max = Math.max(max, numericSuffix(data.expenses[i].id));
    }
    return "E" + pad2(max + 1);
  }

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function hideError(el) {
    if (!el) return;
    el.textContent = "";
    el.hidden = true;
  }

  /* ---------- invoices ---------- */

  function isOverdue(invoice, todayStr) {
    return invoice.status !== "paid" && invoice.dueDate < todayStr;
  }

  function invoiceGroup(invoice, todayStr) {
    if (isOverdue(invoice, todayStr)) return 0;
    if (invoice.status !== "paid") return 1;
    return 2;
  }

  function sortInvoices(list, today) {
    var todayStr = toISODate(today);
    var copy = list.slice();

    copy.sort(function (a, b) {
      var ga = invoiceGroup(a, todayStr);
      var gb = invoiceGroup(b, todayStr);
      if (ga !== gb) return ga - gb;

      if (ga === 0) {
        // Most days overdue first.
        var daysA = daysBetween(parseISODate(a.dueDate), today);
        var daysB = daysBetween(parseISODate(b.dueDate), today);
        return daysB - daysA;
      }
      if (ga === 1) {
        // Nearest due date first.
        return a.dueDate < b.dueDate ? -1 : (a.dueDate > b.dueDate ? 1 : 0);
      }
      // Paid: latest paid date first.
      var pa = a.paidDate || "";
      var pb = b.paidDate || "";
      return pa < pb ? 1 : (pa > pb ? -1 : 0);
    });

    return copy;
  }

  function buildInvoiceItem(invoice, today) {
    var li = document.createElement("li");
    li.className = "invoice-card";

    var header = document.createElement("div");
    header.className = "invoice-card-header";

    var title = document.createElement("h3");
    title.className = "invoice-no";
    title.textContent = invoice.invoiceNo;
    header.appendChild(title);

    if (isOverdue(invoice, toISODate(today))) {
      var days = Math.max(1, daysBetween(parseISODate(invoice.dueDate), today));
      var label = document.createElement("span");
      label.className = "invoice-overdue";
      label.textContent = "Overdue by " + days + " days";
      header.appendChild(label);
    }

    li.appendChild(header);

    var member = findMember(invoice.memberId);
    var dl = document.createElement("dl");
    dl.className = "invoice-details";
    makeDetailRow(dl, "Member", member ? member.name : invoice.memberId);
    makeDetailRow(dl, "Amount", formatRs(invoice.amount));
    makeDetailRow(dl, "Issue date", invoice.issueDate);
    makeDetailRow(dl, "Due date", invoice.dueDate);
    makeDetailRow(dl, "Status", invoice.status);
    makeDetailRow(dl, "Paid date", invoice.paidDate || "-");
    li.appendChild(dl);

    var actions = document.createElement("div");
    actions.className = "invoice-actions";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn invoice-toggle-btn";
    toggle.setAttribute("data-invoice-no", invoice.invoiceNo);
    toggle.textContent = invoice.status === "paid" ? "Mark pending" : "Mark paid";
    actions.appendChild(toggle);

    var view = document.createElement("button");
    view.type = "button";
    view.className = "btn invoice-view-btn";
    view.setAttribute("data-invoice-no", invoice.invoiceNo);
    view.textContent = "View";
    actions.appendChild(view);

    li.appendChild(actions);
    return li;
  }

  function renderInvoices() {
    var list = document.getElementById("invoice-list");
    if (!list) return;

    list.textContent = "";
    var today = todayMidnight();

    if (!data.invoices.length) {
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "No invoices yet.";
      list.appendChild(empty);
      return;
    }

    sortInvoices(data.invoices, today).forEach(function (invoice) {
      list.appendChild(buildInvoiceItem(invoice, today));
    });
  }

  function toggleInvoiceStatus(invoiceNo) {
    var invoice = findInvoice(invoiceNo);
    if (!invoice) return;

    if (invoice.status === "paid") {
      invoice.status = "pending";
      invoice.paidDate = null;
    } else {
      invoice.status = "paid";
      invoice.paidDate = toISODate(todayMidnight());
    }

    saveData();
    renderInvoices();
  }

  function closeInvoiceView() {
    var view = document.getElementById("invoice-view");
    if (view) view.hidden = true;
  }

  function openInvoiceView(invoiceNo) {
    var invoice = findInvoice(invoiceNo);
    var view = document.getElementById("invoice-view");
    var title = document.getElementById("invoice-view-title");
    var dl = document.getElementById("invoice-view-details");
    if (!invoice || !view || !dl) return;

    var member = findMember(invoice.memberId);
    if (title) title.textContent = "Invoice " + invoice.invoiceNo;

    dl.textContent = "";
    makeDetailRow(dl, "Invoice number", invoice.invoiceNo);
    makeDetailRow(dl, "Member", member ? member.name : invoice.memberId);
    makeDetailRow(dl, "Plan", member ? member.plan : "-");
    makeDetailRow(dl, "Amount", formatRs(invoice.amount));
    makeDetailRow(dl, "Issue date", invoice.issueDate);
    makeDetailRow(dl, "Due date", invoice.dueDate);
    makeDetailRow(dl, "Status", invoice.status);
    makeDetailRow(dl, "Paid date", invoice.paidDate || "-");

    view.hidden = false;
  }

  function setupInvoiceList() {
    var list = document.getElementById("invoice-list");
    if (!list) return;

    list.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.getAttribute) return;
      var invoiceNo = target.getAttribute("data-invoice-no");
      if (!invoiceNo) return;

      if (target.classList.contains("invoice-toggle-btn")) {
        toggleInvoiceStatus(invoiceNo);
      } else if (target.classList.contains("invoice-view-btn")) {
        openInvoiceView(invoiceNo);
      }
    });
  }

  function setupInvoiceView() {
    var view = document.getElementById("invoice-view");
    var closeBtn = document.getElementById("invoice-view-close");
    if (closeBtn) closeBtn.addEventListener("click", closeInvoiceView);
    if (view) {
      view.addEventListener("click", function (event) {
        if (event.target === view) closeInvoiceView();
      });
    }
  }

  function populateMemberSelect() {
    var select = document.getElementById("invoice-member");
    if (!select) return;

    select.textContent = "";
    data.members.forEach(function (member) {
      var opt = document.createElement("option");
      opt.value = member.id;
      opt.textContent = member.name;
      select.appendChild(opt);
    });
  }

  function syncInvoiceAmount() {
    var select = document.getElementById("invoice-member");
    var amountEl = document.getElementById("invoice-amount");
    if (!select || !amountEl) return;

    var member = findMember(select.value);
    amountEl.value = member ? String(member.fee) : "";
  }

  function resetInvoiceForm() {
    populateMemberSelect();

    var select = document.getElementById("invoice-member");
    var issueEl = document.getElementById("invoice-issue-date");
    var dueEl = document.getElementById("invoice-due-date");
    var today = todayMidnight();

    if (select && select.options.length) select.selectedIndex = 0;
    syncInvoiceAmount();
    if (issueEl) issueEl.value = toISODate(today);
    if (dueEl) dueEl.value = toISODate(addDays(today, 7));
    hideError(document.getElementById("invoice-error"));
  }

  function handleInvoiceSubmit(event) {
    event.preventDefault();

    var select = document.getElementById("invoice-member");
    var amountEl = document.getElementById("invoice-amount");
    var issueEl = document.getElementById("invoice-issue-date");
    var dueEl = document.getElementById("invoice-due-date");
    var errorEl = document.getElementById("invoice-error");

    var memberId = select ? select.value : "";
    var amount = Number(amountEl ? amountEl.value : "");
    var issueDate = issueEl ? issueEl.value : "";
    var dueDate = dueEl ? dueEl.value : "";

    if (!findMember(memberId)) {
      showError(errorEl, "Select a member");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showError(errorEl, "Amount must be greater than 0");
      return;
    }
    if (!issueDate) {
      showError(errorEl, "Issue date is required");
      return;
    }
    if (!dueDate) {
      showError(errorEl, "Due date is required");
      return;
    }
    if (dueDate < issueDate) {
      showError(errorEl, "Due date cannot be before the issue date");
      return;
    }

    data.invoices.push({
      invoiceNo: nextInvoiceNo(),
      memberId: memberId,
      amount: amount,
      issueDate: issueDate,
      dueDate: dueDate,
      status: "pending",
      paidDate: null
    });

    saveData();
    renderInvoices();
    resetInvoiceForm();
  }

  function setupInvoiceForm() {
    var form = document.getElementById("invoice-form");
    var select = document.getElementById("invoice-member");

    if (select) select.addEventListener("change", syncInvoiceAmount);
    if (form) form.addEventListener("submit", handleInvoiceSubmit);

    resetInvoiceForm();
  }

  /* ---------- expenses ---------- */

  function buildExpenseItem(expense) {
    var li = document.createElement("li");
    li.className = "expense-card";

    var header = document.createElement("div");
    header.className = "expense-card-header";

    var name = document.createElement("h3");
    name.className = "expense-name";
    name.textContent = expense.name;
    header.appendChild(name);
    li.appendChild(header);

    var dl = document.createElement("dl");
    dl.className = "expense-details";
    makeDetailRow(dl, "Amount", formatRs(expense.amount));
    makeDetailRow(dl, "Due date", expense.dueDate);
    makeDetailRow(dl, "Repeats monthly", expense.repeatsMonthly ? "Yes" : "No");
    li.appendChild(dl);

    return li;
  }

  function renderExpenses() {
    var list = document.getElementById("expense-list");
    if (!list) return;

    list.textContent = "";

    if (!data.expenses.length) {
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "No expenses yet.";
      list.appendChild(empty);
      return;
    }

    data.expenses.forEach(function (expense) {
      list.appendChild(buildExpenseItem(expense));
    });
  }

  function resetExpenseForm() {
    var nameEl = document.getElementById("expense-name");
    var amountEl = document.getElementById("expense-amount");
    var dueEl = document.getElementById("expense-due-date");
    var repeatsEl = document.getElementById("expense-repeats");

    if (nameEl) nameEl.value = "";
    if (amountEl) amountEl.value = "";
    if (dueEl) dueEl.value = "";
    if (repeatsEl) repeatsEl.checked = false;
    hideError(document.getElementById("expense-error"));
  }

  function handleExpenseSubmit(event) {
    event.preventDefault();

    var nameEl = document.getElementById("expense-name");
    var amountEl = document.getElementById("expense-amount");
    var dueEl = document.getElementById("expense-due-date");
    var repeatsEl = document.getElementById("expense-repeats");
    var errorEl = document.getElementById("expense-error");

    var name = nameEl ? nameEl.value.trim() : "";
    var amount = Number(amountEl ? amountEl.value : "");
    var dueDate = dueEl ? dueEl.value : "";

    if (!name) {
      showError(errorEl, "Name is required");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showError(errorEl, "Amount must be greater than 0");
      return;
    }
    if (!dueDate) {
      showError(errorEl, "Due date is required");
      return;
    }

    data.expenses.push({
      id: nextExpenseId(),
      name: name,
      amount: amount,
      dueDate: dueDate,
      repeatsMonthly: repeatsEl ? repeatsEl.checked : false
    });

    saveData();
    renderExpenses();
    resetExpenseForm();
  }

  function setupExpenseForm() {
    var form = document.getElementById("expense-form");
    if (form) form.addEventListener("submit", handleExpenseSubmit);
  }

  /* ---------- reset ---------- */

  function setupReset() {
    var btn = document.getElementById("reset-demo-btn");
    if (!btn) return;

    btn.addEventListener("click", function () {
      if (!confirm("Reset all data to the demo sample?")) return;

      if (storage) {
        try {
          storage.removeItem(STORAGE_KEY);
        } catch (e) {
          // Ignore; loadData below still returns a fresh sample.
        }
      }

      data = loadData();
      renderMembers(data);
      renderInvoices();
      renderExpenses();
      resetInvoiceForm();
      resetExpenseForm();
    });
  }

  /* ---------- init ---------- */

  function init() {
    storage = getStorage();
    data = loadData();
    renderMembers(data);
    setupTabs();

    setupInvoiceForm();
    setupInvoiceList();
    setupInvoiceView();
    setupExpenseForm();
    setupReset();
    renderInvoices();
    renderExpenses();
  }


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
