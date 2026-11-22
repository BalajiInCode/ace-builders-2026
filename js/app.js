/* GymKhata - all front-end logic in one file (fake data only, no backend) */

(function () {
  "use strict";

  var STORAGE_KEY = "gymkhata";
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

  /* ---------- init ---------- */

  function init() {
    var data = loadData();
    renderMembers(data);
    setupTabs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
