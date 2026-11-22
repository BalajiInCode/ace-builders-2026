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
    // Overdue members (category 2: i = 2, 5, 8, 11, 14, 17) get these plans and days overdue.
    var OVERDUE_PLANS = { 2: "monthly", 5: "monthly", 8: "3 months", 11: "3 months", 14: "yearly", 17: "yearly" };
    var OVERDUE_DAYS = { 2: 3, 5: 5, 8: 8, 11: 12, 14: 18, 17: 25 };

    for (var i = 0; i < 18; i++) {
      var id = "M" + pad2(i + 1);
      var plan = (i % 3 === 2) ? OVERDUE_PLANS[i] : PLANS[i % 3];
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
        dueDate = addDays(today, -OVERDUE_DAYS[i]);
        issueDate = addDays(dueDate, -7);
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
      settings: { renewalRate: 0.7, openingCashBalance: 85000 }
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
    makeDetailRow(dl, "Fee", formatRs(member.fee));
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
      if (targetId === "dashboard") renderDashboard();
      if (targetId === "reminders") renderReminders();
      if (targetId === "forecast") {
        fillForecastSettings();
        renderForecast();
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

  // "2026-11-12" -> "12 Nov 2026"
  function formatDisplayDate(str) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var d = parseISODate(str);
    if (!d) return "";
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
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

  /* ---------- dashboard ---------- */

  function buildSummary(today) {
    var todayStr = toISODate(today);
    var totalPending = 0;
    var totalOverdue = 0;
    var overdueMembers = {};
    var membersWithOverdue = 0;

    data.invoices.forEach(function (invoice) {
      if (invoice.status === "paid") return;
      totalPending += Number(invoice.amount);

      if (isOverdue(invoice, todayStr)) {
        totalOverdue += Number(invoice.amount);
        if (!overdueMembers[invoice.memberId]) {
          overdueMembers[invoice.memberId] = true;
          membersWithOverdue++;
        }
      }
    });

    var expiringCount = 0;
    data.members.forEach(function (member) {
      if (isExpiringSoon(member, today)) expiringCount++;
    });

    return {
      totalPending: totalPending,
      totalOverdue: totalOverdue,
      membersWithOverdue: membersWithOverdue,
      expiringCount: expiringCount
    };
  }

  function buildOwesList(today) {
    var todayStr = toISODate(today);
    var groups = {};
    var entries = [];

    data.invoices.forEach(function (invoice) {
      if (invoice.status === "paid") return;

      var entry = groups[invoice.memberId];
      if (!entry) {
        var member = findMember(invoice.memberId);
        entry = {
          memberId: invoice.memberId,
          name: member ? member.name : invoice.memberId,
          total: 0,
          oldestDue: invoice.dueDate,
          hasOverdue: false,
          overdueSince: null,
          daysOverdue: 0
        };
        groups[invoice.memberId] = entry;
        entries.push(entry);
      }

      entry.total += Number(invoice.amount);
      if (invoice.dueDate < entry.oldestDue) entry.oldestDue = invoice.dueDate;

      if (isOverdue(invoice, todayStr)) {
        entry.hasOverdue = true;
        if (entry.overdueSince === null || invoice.dueDate < entry.overdueSince) {
          entry.overdueSince = invoice.dueDate;
        }
      }
    });

    entries.forEach(function (entry) {
      entry.daysOverdue = entry.hasOverdue ? daysBetween(parseISODate(entry.overdueSince), today) : 0;
    });

    entries.sort(function (a, b) {
      if (a.hasOverdue !== b.hasOverdue) return a.hasOverdue ? -1 : 1;
      if (a.hasOverdue && a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue;
      return b.total - a.total;
    });

    return entries;
  }

  function makeSummaryCard(label, value) {
    var card = document.createElement("div");
    card.className = "summary-card";

    var labelEl = document.createElement("p");
    labelEl.className = "summary-label";
    labelEl.textContent = label;
    card.appendChild(labelEl);

    var valueEl = document.createElement("p");
    valueEl.className = "summary-value";
    valueEl.textContent = value;
    card.appendChild(valueEl);

    return card;
  }

  function makeEmptyItem(text) {
    var li = document.createElement("li");
    li.className = "empty-note";
    li.textContent = text;
    return li;
  }

  function buildOwesItem(entry) {
    var li = document.createElement("li");
    li.className = "dashboard-card";

    var header = document.createElement("div");
    header.className = "dashboard-card-header";

    var name = document.createElement("h3");
    name.className = "dashboard-name";
    name.textContent = entry.name;
    header.appendChild(name);

    var pill = document.createElement("span");
    if (entry.hasOverdue) {
      pill.className = "invoice-overdue";
      pill.textContent = "Overdue by " + entry.daysOverdue + (entry.daysOverdue === 1 ? " day" : " days");
    } else {
      pill.className = "dashboard-not-due";
      pill.textContent = "Not due yet";
    }
    header.appendChild(pill);

    li.appendChild(header);

    var dl = document.createElement("dl");
    dl.className = "details";
    makeDetailRow(dl, "Pending", formatRs(entry.total));
    makeDetailRow(dl, "Oldest due date", entry.oldestDue);
    li.appendChild(dl);

    return li;
  }

  function buildExpiringItem(member, today) {
    var li = document.createElement("li");
    li.className = "dashboard-card";

    var header = document.createElement("div");
    header.className = "dashboard-card-header";

    var name = document.createElement("h3");
    name.className = "dashboard-name";
    name.textContent = member.name;
    header.appendChild(name);
    li.appendChild(header);

    var daysLeft = daysBetween(today, parseISODate(member.endDate));
    var leftText = daysLeft === 0 ? "Today" : (daysLeft === 1 ? "1 day left" : daysLeft + " days left");

    var dl = document.createElement("dl");
    dl.className = "details";
    makeDetailRow(dl, "Plan", member.plan);
    makeDetailRow(dl, "End date", member.endDate);
    makeDetailRow(dl, "Days left", leftText);
    li.appendChild(dl);

    return li;
  }

  function renderDashboard() {
    var summaryEl = document.getElementById("dashboard-summary");
    var owesEl = document.getElementById("dashboard-owes-list");
    var expiringEl = document.getElementById("dashboard-expiring-list");
    if (!summaryEl || !owesEl || !expiringEl) return;

    var today = todayMidnight();
    var summary = buildSummary(today);

    summaryEl.textContent = "";
    summaryEl.appendChild(makeSummaryCard("Total pending", formatRs(summary.totalPending)));
    summaryEl.appendChild(makeSummaryCard("Total overdue", formatRs(summary.totalOverdue)));
    summaryEl.appendChild(makeSummaryCard("Members with overdue invoices", String(summary.membersWithOverdue)));
    summaryEl.appendChild(makeSummaryCard("Expiring this week", String(summary.expiringCount)));

    owesEl.textContent = "";
    var owes = buildOwesList(today);
    if (!owes.length) {
      owesEl.appendChild(makeEmptyItem("No pending payments"));
    } else {
      if (!owes[0].hasOverdue) {
        owesEl.appendChild(makeEmptyItem("No overdue payments"));
      }
      owes.forEach(function (entry) {
        owesEl.appendChild(buildOwesItem(entry));
      });
    }

    expiringEl.textContent = "";
    var expiring = data.members.filter(function (member) {
      return isExpiringSoon(member, today);
    });
    expiring.sort(function (a, b) {
      return a.endDate < b.endDate ? -1 : (a.endDate > b.endDate ? 1 : 0);
    });

    if (!expiring.length) {
      expiringEl.appendChild(makeEmptyItem("No members expiring this week"));
    } else {
      expiring.forEach(function (member) {
        expiringEl.appendChild(buildExpiringItem(member, today));
      });
    }
  }

  /* ---------- reminders ---------- */

  function buildPaymentReminders(today) {
    var todayStr = toISODate(today);
    var groups = {};
    var entries = [];

    data.invoices.forEach(function (invoice) {
      if (!isOverdue(invoice, todayStr)) return;

      var member = findMember(invoice.memberId);
      if (!member) return;

      var entry = groups[member.id];
      if (!entry) {
        entry = { member: member, total: 0, oldestDue: invoice.dueDate, daysOverdue: 0 };
        groups[member.id] = entry;
        entries.push(entry);
      }

      entry.total += Number(invoice.amount);
      if (invoice.dueDate < entry.oldestDue) entry.oldestDue = invoice.dueDate;
    });

    entries.forEach(function (entry) {
      entry.daysOverdue = daysBetween(parseISODate(entry.oldestDue), today);
    });

    entries.sort(function (a, b) {
      if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue;
      return b.total - a.total;
    });

    return entries;
  }

  function buildRenewalReminders(today) {
    var entries = [];

    data.members.forEach(function (member) {
      if (!isExpiringSoon(member, today)) return;
      entries.push({ member: member, daysLeft: daysBetween(today, parseISODate(member.endDate)) });
    });

    entries.sort(function (a, b) {
      return a.member.endDate < b.member.endDate ? -1 : (a.member.endDate > b.member.endDate ? 1 : 0);
    });

    return entries;
  }

  function dayCountText(n) {
    return n + (n === 1 ? " day" : " days");
  }

  function paymentReason(entry) {
    return "Overdue by " + dayCountText(entry.daysOverdue) + ", " + formatRs(entry.total);
  }

  function renewalReason(entry) {
    return entry.daysLeft === 0 ? "Plan ends today" : "Plan ends in " + dayCountText(entry.daysLeft);
  }

  // Fixed templates only. lang is "hi" (Hindi in Roman script) or "en".
  function paymentMessage(entry, lang) {
    var name = entry.member.name;
    var amount = formatRs(entry.total);
    var due = formatDisplayDate(entry.oldestDue);

    if (lang === "en") {
      return "Hello " + name + ", your fee of " + amount + " has been pending since " + due +
        " (" + dayCountText(entry.daysOverdue) + " overdue). Please pay at your earliest convenience. Thank you!";
    }
    var daysText = entry.daysOverdue === 1 ? "(1 din ho gaya)" : "(" + entry.daysOverdue + " din ho gaye)";
    return "Namaste " + name + " ji, aapki " + amount + " ki fees " + due +
      " se baaki hai " + daysText + ". Kripya jaldi jama kar dein. Dhanyavaad!";
  }

  function renewalMessage(entry, lang) {
    var member = entry.member;
    var endDate = formatDisplayDate(member.endDate);
    var fee = formatRs(member.fee);

    if (lang === "en") {
      var whenEn = entry.daysLeft === 0 ? "today" : "in " + dayCountText(entry.daysLeft);
      return "Hello " + member.name + ", your " + member.plan + " plan ends " + whenEn +
        " (" + endDate + "). The renewal fee is " + fee + ". Please renew to keep training without a break. Thank you!";
    }
    var whenHi = entry.daysLeft === 0 ? "aaj" : entry.daysLeft + " din mein";
    return "Namaste " + member.name + " ji, aapka " + member.plan + " plan " + whenHi +
      " khatm ho raha hai (" + endDate + "). Renewal fees " + fee + " hai. Renew karne ke liye kripya sampark karein. Dhanyavaad!";
  }

  function copyWithTextarea(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);

    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function selectNodeText(el) {
    if (!window.getSelection || !document.createRange) return;
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function copyReminderText(messageEl, button, note) {
    var text = messageEl.textContent;

    function onCopied() {
      note.hidden = true;
      note.textContent = "";
      button.textContent = "Copied!";
      setTimeout(function () {
        button.textContent = "Copy message";
      }, 1500);
    }

    function onFailed() {
      note.textContent = "Select the text and copy it manually";
      note.hidden = false;
      selectNodeText(messageEl);
    }

    function fallbackCopy() {
      if (copyWithTextarea(text)) onCopied();
      else onFailed();
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onCopied, fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function buildReminderCard(name, reason, reasonClass, buildText) {
    var li = document.createElement("li");
    li.className = "reminder-card";

    var header = document.createElement("div");
    header.className = "reminder-card-header";

    var nameEl = document.createElement("h3");
    nameEl.className = "reminder-name";
    nameEl.textContent = name;
    header.appendChild(nameEl);

    var reasonEl = document.createElement("span");
    reasonEl.className = reasonClass;
    reasonEl.textContent = reason;
    header.appendChild(reasonEl);

    li.appendChild(header);

    var langRow = document.createElement("div");
    langRow.className = "reminder-lang";
    var langBtns = [];
    [["hi", "Hindi"], ["en", "English"]].forEach(function (pair) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn reminder-lang-btn";
      btn.setAttribute("data-lang", pair[0]);
      btn.textContent = pair[1];
      langRow.appendChild(btn);
      langBtns.push(btn);
    });
    li.appendChild(langRow);

    var message = document.createElement("p");
    message.className = "reminder-message";
    li.appendChild(message);

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn btn-primary reminder-copy-btn";
    copyBtn.textContent = "Copy message";
    li.appendChild(copyBtn);

    var note = document.createElement("p");
    note.className = "reminder-copy-note";
    note.setAttribute("role", "status");
    note.hidden = true;
    li.appendChild(note);

    function showLanguage(lang) {
      message.textContent = buildText(lang);
      langBtns.forEach(function (btn) {
        var active = btn.getAttribute("data-lang") === lang;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    langBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        showLanguage(btn.getAttribute("data-lang"));
      });
    });

    copyBtn.addEventListener("click", function () {
      copyReminderText(message, copyBtn, note);
    });

    showLanguage("hi");
    return li;
  }

  function renderReminders() {
    var paymentEl = document.getElementById("reminders-payment-list");
    var renewalEl = document.getElementById("reminders-renewal-list");
    if (!paymentEl || !renewalEl) return;

    var today = todayMidnight();

    paymentEl.textContent = "";
    var payments = buildPaymentReminders(today);
    if (!payments.length) {
      paymentEl.appendChild(makeEmptyItem("No overdue payments to remind"));
    } else {
      payments.forEach(function (entry) {
        paymentEl.appendChild(buildReminderCard(
          entry.member.name,
          paymentReason(entry),
          "invoice-overdue",
          function (lang) { return paymentMessage(entry, lang); }
        ));
      });
    }

    renewalEl.textContent = "";
    var renewals = buildRenewalReminders(today);
    if (!renewals.length) {
      renewalEl.appendChild(makeEmptyItem("No plans ending in the next 7 days"));
    } else {
      renewals.forEach(function (entry) {
        renewalEl.appendChild(buildReminderCard(
          entry.member.name,
          renewalReason(entry),
          "badge badge-expiring",
          function (lang) { return renewalMessage(entry, lang); }
        ));
      });
    }
  }

  /* ---------- forecast ---------- */

  var SVG_NS = "http://www.w3.org/2000/svg";
  var forecastHorizon = 30;

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  // Same day of the month, clamped to the month's last day (e.g. 31 -> 30 in April).
  function occurrenceInMonth(year, monthIndex, dayOfMonth) {
    var first = new Date(year, monthIndex, 1);
    var y = first.getFullYear();
    var m = first.getMonth();
    return new Date(y, m, Math.min(dayOfMonth, daysInMonth(y, m)));
  }

  function addAtOffset(amounts, offset, amount) {
    if (offset >= 0 && offset < amounts.length) amounts[offset] += amount;
  }

  // overdueDelayDays (optional, default 7): days from today until overdue invoices are collected.
  function computeForecast(horizonDays, renewalRate, excludedMemberIds, overdueDelayDays) {
    var today = todayMidnight();
    var todayStr = toISODate(today);
    var rate = Number(renewalRate) || 0;
    var excluded = excludedMemberIds || [];
    var overdueDelay = overdueDelayDays === undefined ? 7 : (Number(overdueDelayDays) || 0);
    var openingCash = Number(data.settings.openingCashBalance) || 0;
    var incomeByDay = [];
    var expenseByDay = [];
    var d;

    for (d = 0; d < horizonDays; d++) {
      incomeByDay.push(0);
      expenseByDay.push(0);
    }

    // 1) Pending invoices: overdue ones collected overdueDelay days from today, others on due date.
    data.invoices.forEach(function (invoice) {
      if (invoice.status === "paid") return;
      var member = findMember(invoice.memberId);
      if (!member) return;

      var amount = Number(invoice.amount) || 0;
      if (isOverdue(invoice, todayStr)) {
        addAtOffset(incomeByDay, overdueDelay, amount);
        return;
      }
      var due = parseISODate(invoice.dueDate);
      if (!due) return;
      addAtOffset(incomeByDay, daysBetween(today, due), amount);
    });

    // 2) Renewals: rate x fee on each end date, repeating every plan length.
    data.members.forEach(function (member) {
      if (excluded.indexOf(member.id) !== -1) return;
      var duration = DURATION_DAYS[member.plan];
      var endDate = parseISODate(member.endDate);
      if (!duration || !endDate) return;

      var firstEnd = daysBetween(today, endDate);
      if (firstEnd < 0) return; // plan already ended before today

      var amount = rate * (Number(member.fee) || 0);
      for (var off = firstEnd; off < horizonDays; off += duration) {
        addAtOffset(incomeByDay, off, amount);
      }
    });

    // 3) Expenses: one-off on due date; monthly ones repeat on the same day each month.
    var monthsToCheck = Math.ceil(horizonDays / 28) + 1;
    data.expenses.forEach(function (expense) {
      var due = parseISODate(expense.dueDate);
      var amount = Number(expense.amount) || 0;
      if (!due) return;

      if (!expense.repeatsMonthly) {
        addAtOffset(expenseByDay, daysBetween(today, due), amount);
        return;
      }
      for (var k = 0; k < monthsToCheck; k++) {
        var occurrence = occurrenceInMonth(today.getFullYear(), today.getMonth() + k, due.getDate());
        if (occurrence < due) continue;
        addAtOffset(expenseByDay, daysBetween(today, occurrence), amount);
      }
    });

    // 4) Day-by-day cash, lowest point and first negative day.
    var days = [];
    var runningIncome = 0;
    var runningExpenses = 0;
    var firstNegativeDate = null;
    var lowest = null;

    for (d = 0; d < horizonDays; d++) {
      runningIncome += incomeByDay[d];
      runningExpenses += expenseByDay[d];
      var cash = openingCash + runningIncome - runningExpenses;
      var dateStr = toISODate(addDays(today, d));
      days.push({ date: dateStr, cash: cash });

      if (firstNegativeDate === null && cash < 0) firstNegativeDate = dateStr;
      if (lowest === null || cash < lowest.cash) lowest = { cash: cash, date: dateStr };
    }

    // 5) Weeks: Week 1 = days 0-6, Week 2 = days 7-13, last week may be shorter.
    var weeks = [];
    for (var start = 0; start < horizonDays; start += 7) {
      var end = Math.min(start + 6, horizonDays - 1);
      var weekIncome = 0;
      var weekExpenses = 0;
      for (var j = start; j <= end; j++) {
        weekIncome += incomeByDay[j];
        weekExpenses += expenseByDay[j];
      }
      weeks.push({
        label: "Week " + (weeks.length + 1),
        income: weekIncome,
        expenses: weekExpenses,
        closingCash: days[end].cash
      });
    }

    return {
      horizonDays: horizonDays,
      renewalRate: rate,
      openingCash: openingCash,
      totalIncome: runningIncome,
      totalExpenses: runningExpenses,
      endCash: days[horizonDays - 1].cash,
      lowest: lowest,
      firstNegativeDate: firstNegativeDate,
      weeks: weeks
    };
  }

  function fillForecastSettings() {
    var openingEl = document.getElementById("forecast-opening-cash");
    var rateEl = document.getElementById("forecast-renewal-rate");
    if (openingEl) openingEl.value = String(Number(data.settings.openingCashBalance) || 0);
    if (rateEl) rateEl.value = String(Math.round((Number(data.settings.renewalRate) || 0) * 10000) / 100);
  }

  function handleForecastSettingsSubmit(event) {
    event.preventDefault();

    var openingEl = document.getElementById("forecast-opening-cash");
    var rateEl = document.getElementById("forecast-renewal-rate");
    var errorEl = document.getElementById("forecast-settings-error");
    var statusEl = document.getElementById("forecast-settings-status");

    var openingText = openingEl ? openingEl.value.trim() : "";
    var rateText = rateEl ? rateEl.value.trim() : "";
    hideError(statusEl);

    var opening = Number(openingText);
    if (openingText === "" || isNaN(opening) || opening < 0) {
      showError(errorEl, "Opening cash balance must be 0 or more");
      return;
    }
    var ratePercent = Number(rateText);
    if (rateText === "" || isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) {
      showError(errorEl, "Renewal rate must be between 0 and 100");
      return;
    }

    hideError(errorEl);
    data.settings.openingCashBalance = opening;
    data.settings.renewalRate = ratePercent / 100;
    saveData();
    showError(statusEl, "Settings saved");
    resetWhatIfControls();
    renderForecast();
  }

  function syncHorizonButtons() {
    var buttons = document.querySelectorAll(".forecast-horizon-btn");
    for (var i = 0; i < buttons.length; i++) {
      var active = Number(buttons[i].getAttribute("data-horizon")) === forecastHorizon;
      buttons[i].classList.toggle("is-active", active);
      buttons[i].setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function makeTableCell(text, negative) {
    var td = document.createElement("td");
    td.textContent = text;
    if (negative) td.className = "is-negative";
    return td;
  }

  function buildWeekRow(week) {
    var tr = document.createElement("tr");

    var label = document.createElement("th");
    label.setAttribute("scope", "row");
    label.textContent = week.label;
    tr.appendChild(label);

    tr.appendChild(makeTableCell(formatRs(week.income), false));
    tr.appendChild(makeTableCell(formatRs(week.expenses), false));
    tr.appendChild(makeTableCell(formatRs(week.closingCash), week.closingCash < 0));
    return tr;
  }

  // Bar chart of closing cash per week, inline SVG. Zero line is drawn; negative weeks are red.
  // If whatIfWeeks is given, a second bar per week shows the what-if closing cash.
  function buildClosingChart(weeks, whatIfWeeks) {
    var WIDTH = 320;
    var HEIGHT = 200;
    var TOP = 10;
    var PLOT_BOTTOM = 170;

    var minVal = 0;
    var maxVal = 0;
    var allWeeks = whatIfWeeks ? weeks.concat(whatIfWeeks) : weeks;
    allWeeks.forEach(function (week) {
      minVal = Math.min(minVal, week.closingCash);
      maxVal = Math.max(maxVal, week.closingCash);
    });
    var span = maxVal - minVal;
    if (span === 0) span = 1;

    function yOf(value) {
      return TOP + ((maxVal - value) / span) * (PLOT_BOTTOM - TOP);
    }

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "forecast-svg");
    svg.setAttribute("viewBox", "0 0 " + WIDTH + " " + HEIGHT);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Closing cash per week");

    var zeroY = yOf(0);
    var slotW = WIDTH / weeks.length;
    var barW = whatIfWeeks ? slotW * 0.35 : slotW * 0.6;
    var GAP = 2;

    function addBar(x, value, week, seriesName, barClass) {
      var valueY = yOf(value);
      var barTop = Math.min(valueY, zeroY);
      var barH = Math.max(Math.abs(valueY - zeroY), 1);

      var rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(barTop));
      rect.setAttribute("width", String(barW));
      rect.setAttribute("height", String(barH));
      rect.setAttribute("class", value < 0 ? barClass + " is-negative" : barClass);

      var title = document.createElementNS(SVG_NS, "title");
      title.textContent = (seriesName ? seriesName + " " : "") + week.label + ": " + formatRs(value);
      rect.appendChild(title);
      svg.appendChild(rect);
    }

    weeks.forEach(function (week, i) {
      var center = i * slotW + slotW / 2;
      if (whatIfWeeks) {
        addBar(center - GAP / 2 - barW, week.closingCash, week, "Base", "forecast-bar");
        addBar(center + GAP / 2, whatIfWeeks[i].closingCash, week, "What-if", "forecast-bar forecast-bar-whatif");
      } else {
        addBar(center - barW / 2, week.closingCash, week, "", "forecast-bar");
      }

      var label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", String(center));
      label.setAttribute("y", String(HEIGHT - 6));
      label.setAttribute("class", "forecast-bar-label");
      label.textContent = "W" + (i + 1);
      svg.appendChild(label);
    });

    var zeroLine = document.createElementNS(SVG_NS, "line");
    zeroLine.setAttribute("x1", "0");
    zeroLine.setAttribute("x2", String(WIDTH));
    zeroLine.setAttribute("y1", String(zeroY));
    zeroLine.setAttribute("y2", String(zeroY));
    zeroLine.setAttribute("class", "forecast-zero-line");
    svg.appendChild(zeroLine);

    return svg;
  }


  function forecastsDiffer(a, b) {
    if (a.endCash !== b.endCash || a.lowest.cash !== b.lowest.cash ||
        a.firstNegativeDate !== b.firstNegativeDate) {
      return true;
    }
    for (var i = 0; i < a.weeks.length; i++) {
      if (a.weeks[i].closingCash !== b.weeks[i].closingCash) return true;
    }
    return false;
  }

  // -150 -> "-Rs 150", 150 -> "+Rs 150"
  function formatSignedRs(amount) {
    return amount < 0 ? "-" + formatRs(-amount) : "+" + formatRs(amount);
  }

  function buildCompareRow(label, baseText, whatIfText, whatIfNegative, diffText, diffNegative) {
    var tr = document.createElement("tr");

    var th = document.createElement("th");
    th.setAttribute("scope", "row");
    th.textContent = label;
    tr.appendChild(th);

    tr.appendChild(makeTableCell(baseText, false));
    tr.appendChild(makeTableCell(whatIfText, whatIfNegative));
    tr.appendChild(makeTableCell(diffText, diffNegative));
    return tr;
  }

  function buildChartLegend() {
    var legend = document.createElement("div");
    legend.className = "forecast-legend";

    [["is-base", "Base"], ["is-whatif", "What-if"]].forEach(function (pair) {
      var item = document.createElement("span");
      item.className = "forecast-legend-item";
      var swatch = document.createElement("span");
      swatch.className = "forecast-legend-swatch " + pair[0];
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(pair[1]));
      legend.appendChild(item);
    });

    return legend;
  }

  // "A, B, C, D, E and 2 more" (at most 5 names shown)
  function listNames(names) {
    var shown = names.slice(0, 5).join(", ");
    if (names.length > 5) shown += " and " + (names.length - 5) + " more";
    return shown;
  }

  // Rule-based suggestion for the what-if result. No AI.
  function buildWhatIfSuggestion(whatIf, today) {
    if (whatIf.lowest.cash < 0) {
      var dateText = formatDisplayDate(whatIf.firstNegativeDate);
      var overdue = buildPaymentReminders(today);
      if (overdue.length) {
        var total = 0;
        overdue.forEach(function (entry) { total += entry.total; });
        return "Cash may go below Rs 0 on " + dateText + ". Send payment reminders this week to these " +
          overdue.length + " members: " + listNames(overdue.map(function (entry) { return entry.member.name; })) +
          ". Their total overdue amount is " + formatRs(total) + ".";
      }
      return "Cash may go below Rs 0 on " + dateText + ". Review upcoming expenses and chase pending invoices.";
    }

    var renewals = buildRenewalReminders(today);
    if (renewals.length) {
      return "Send renewal reminders to these " + renewals.length + " members this week: " +
        listNames(renewals.map(function (entry) { return entry.member.name; })) + ".";
    }
    return "Cash looks healthy in this scenario. Keep following up on pending invoices.";
  }

  function renderForecast() {
    var summaryEl = document.getElementById("forecast-summary");
    var lowestEl = document.getElementById("forecast-lowest");
    var warningEl = document.getElementById("forecast-warning");
    var tableBody = document.getElementById("forecast-table-body");
    var chartEl = document.getElementById("forecast-chart");
    var assumptionsEl = document.getElementById("forecast-assumptions");
    if (!summaryEl || !lowestEl || !warningEl || !tableBody || !chartEl || !assumptionsEl) return;

    var result = computeForecast(forecastHorizon, data.settings.renewalRate, []);
    syncHorizonButtons();

    var rateEl = document.getElementById("whatif-renewal-rate");
    var delayEl = document.getElementById("whatif-overdue-delay");
    var rateValueEl = document.getElementById("whatif-renewal-value");
    var compareBody = document.getElementById("whatif-comparison-body");
    var sameNoteEl = document.getElementById("whatif-same-note");
    var whatIfWarningEl = document.getElementById("whatif-warning");
    var suggestionEl = document.getElementById("whatif-suggestion-text");
    if (!rateEl || !delayEl || !rateValueEl || !compareBody || !sameNoteEl || !whatIfWarningEl || !suggestionEl) return;

    // What-if runs the same formula with the what-if renewal rate and overdue delay.
    var whatIf = computeForecast(forecastHorizon, Number(rateEl.value) / 100, [], Number(delayEl.value));
    var changed = forecastsDiffer(result, whatIf);
    rateValueEl.textContent = rateEl.value + "%";

    summaryEl.textContent = "";
    summaryEl.appendChild(makeSummaryCard("Expected income", formatRs(result.totalIncome)));
    summaryEl.appendChild(makeSummaryCard("Total expenses", formatRs(result.totalExpenses)));
    summaryEl.appendChild(makeSummaryCard("Expected cash in " + forecastHorizon + " days", formatRs(result.endCash)));

    lowestEl.textContent = "Lowest cash point: " + formatRs(result.lowest.cash) +
      " on " + formatDisplayDate(result.lowest.date);

    if (result.firstNegativeDate) {
      warningEl.textContent = "Warning: cash goes below Rs 0 on " +
        formatDisplayDate(result.firstNegativeDate) + ". Chase fees or plan for this gap.";
      warningEl.hidden = false;
    } else {
      warningEl.textContent = "";
      warningEl.hidden = true;
    }

    tableBody.textContent = "";
    result.weeks.forEach(function (week) {
      tableBody.appendChild(buildWeekRow(week));
    });

    chartEl.textContent = "";
    chartEl.appendChild(buildClosingChart(result.weeks, changed ? whatIf.weeks : null));
    if (changed) chartEl.appendChild(buildChartLegend());

    compareBody.textContent = "";
    var endDiff = whatIf.endCash - result.endCash;
    compareBody.appendChild(buildCompareRow("Cash in " + forecastHorizon + " days",
      formatRs(result.endCash), formatRs(whatIf.endCash), whatIf.endCash < 0,
      formatSignedRs(endDiff), endDiff < 0));
    var lowDiff = whatIf.lowest.cash - result.lowest.cash;
    compareBody.appendChild(buildCompareRow("Lowest cash point",
      formatRs(result.lowest.cash), formatRs(whatIf.lowest.cash), whatIf.lowest.cash < 0,
      formatSignedRs(lowDiff), lowDiff < 0));
    compareBody.appendChild(buildCompareRow("Lowest cash date",
      formatDisplayDate(result.lowest.date), formatDisplayDate(whatIf.lowest.date), false, "-", false));

    sameNoteEl.hidden = changed;
    if (changed && whatIf.firstNegativeDate) {
      whatIfWarningEl.textContent = "What-if warning: cash goes below Rs 0 on " +
        formatDisplayDate(whatIf.firstNegativeDate) + ". Chase overdue fees or plan for this gap.";
      whatIfWarningEl.hidden = false;
    } else {
      whatIfWarningEl.textContent = "";
      whatIfWarningEl.hidden = true;
    }

    suggestionEl.textContent = buildWhatIfSuggestion(whatIf, todayMidnight());

    var pct = Math.round(result.renewalRate * 10000) / 100;
    var whatIfText = changed
      ? " What-if: renewal rate " + rateEl.value + "%, overdue payments arrive after " + delayEl.value + " days."
      : "";
    assumptionsEl.textContent = "Assumptions: overdue invoices are assumed collected in 7 days; " +
      "renewals are counted at your renewal rate (" + pct + "%)." + whatIfText + " " +
      "This is an estimate based on sample data and your renewal rate, not a guarantee.";
  }

  function savedRatePercent() {
    return Math.round((Number(data.settings.renewalRate) || 0) * 10000) / 100;
  }

  // Sets the what-if controls only. null leaves that control unchanged. Never writes data.
  function setWhatIfControls(rate, delay) {
    var rateEl = document.getElementById("whatif-renewal-rate");
    var delayEl = document.getElementById("whatif-overdue-delay");
    if (rateEl && rate !== null) rateEl.value = String(rate);
    if (delayEl && delay !== null) delayEl.value = String(delay);
  }

  function resetWhatIfControls() {
    setWhatIfControls(savedRatePercent(), 7);
  }

  function setupWhatIf() {
    var rateEl = document.getElementById("whatif-renewal-rate");
    var delayEl = document.getElementById("whatif-overdue-delay");
    if (rateEl) rateEl.addEventListener("input", renderForecast);
    if (delayEl) delayEl.addEventListener("change", renderForecast);

    function onClick(id, handler) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener("click", handler);
    }

    onClick("whatif-drop-renewals-btn", function () {
      setWhatIfControls(Math.min(50, savedRatePercent()), null);
      renderForecast();
    });
    onClick("whatif-late-overdue-btn", function () {
      setWhatIfControls(null, 15);
      renderForecast();
    });
    onClick("whatif-both-btn", function () {
      setWhatIfControls(Math.min(50, savedRatePercent()), 15);
      renderForecast();
    });
    onClick("whatif-reset-btn", function () {
      resetWhatIfControls();
      renderForecast();
    });
    onClick("whatif-reminders-btn", function () {
      // Reuse the existing tab switching: clicking the Reminders tab runs showSection().
      var tab = document.querySelector(".tab[data-target='reminders']");
      if (tab) tab.click();
    });

    resetWhatIfControls();
  }

  function setupForecast() {
    var form = document.getElementById("forecast-settings-form");
    if (form) form.addEventListener("submit", handleForecastSettingsSubmit);

    var buttons = document.querySelectorAll(".forecast-horizon-btn");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (event) {
        forecastHorizon = Number(event.currentTarget.getAttribute("data-horizon"));
        renderForecast();
      });
    }

    setupWhatIf();
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
    setupForecast();
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
