/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมทุกหน้า)
   ตรวจว่าหน้านั้นมี element อะไร แล้วรันเฉพาะฟังก์ชันที่เกี่ยวข้อง
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "bodyScentOrders";
  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];
  var TYPE_LABELS = { spray: "สเปรย์", rollon: "โรลออน" };

  /* ---------- Helpers ---------- */

  function byId(id) {
    return document.getElementById(id);
  }

  function formatPrice(n) {
    return Number(n).toLocaleString("th-TH");
  }

  function moodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  function isValidMood(key) {
    return MOODS.some(function (m) {
      return m.key === key && key !== "all";
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  // อ่านค่าจาก input/textarea (value) หรือ element ทั่วไป (textContent)
  function readValue(node) {
    if (!node) return "";
    var v = "value" in node ? node.value : node.textContent;
    return String(v || "").trim();
  }

  // เขียนค่าลง input/textarea (value) หรือ element ทั่วไป (textContent)
  function writeValue(node, value) {
    if (!node) return;
    if ("value" in node) {
      node.value = value;
    } else {
      node.textContent = value;
    }
  }

  /* ==========================================================================
     product.html
     ========================================================================== */

  function initProductPage() {
    var list = byId("product-list");
    var filterBar = byId("filter-bar");
    if (!list) return;

    var products = [];
    var activeMood = "all";

    // mood เริ่มต้นจาก ?mood=xxx
    var paramMood = new URLSearchParams(window.location.search).get("mood");
    if (paramMood) {
      paramMood = paramMood.toLowerCase();
      if (isValidMood(paramMood)) activeMood = paramMood;
    }

    function buildFilterBar() {
      if (!filterBar) return;
      filterBar.textContent = "";
      MOODS.forEach(function (m) {
        var btn = el("button", "chip");
        btn.type = "button";
        btn.dataset.mood = m.key;
        if (m.key !== "all") {
          var dot = el("span", "mood-dot");
          dot.setAttribute("aria-hidden", "true");
          btn.setAttribute("data-mood", m.key);
          btn.appendChild(dot);
        }
        btn.appendChild(document.createTextNode(m.label));
        btn.addEventListener("click", function () {
          setMood(m.key);
        });
        filterBar.appendChild(btn);
      });
    }

    function syncFilterBar() {
      if (!filterBar) return;
      var buttons = filterBar.querySelectorAll(".chip");
      Array.prototype.forEach.call(buttons, function (btn) {
        var on = btn.dataset.mood === activeMood;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    function syncUrl() {
      if (!window.history || !window.history.replaceState) return;
      var url = new URL(window.location.href);
      if (activeMood === "all") {
        url.searchParams.delete("mood");
      } else {
        url.searchParams.set("mood", activeMood);
      }
      window.history.replaceState(null, "", url.toString());
    }

    function setMood(key) {
      activeMood = key;
      syncFilterBar();
      syncUrl();
      renderProducts();
    }

    function buildOrderUrl(p) {
      var itemName = p.name + (p.size ? " " + p.size : "");
      return (
        "order.html?item=" +
        encodeURIComponent(itemName) +
        "&price=" +
        encodeURIComponent(p.price)
      );
    }

    function buildCard(p) {
      var card = el("article", "product-card");
      card.setAttribute("data-mood", p.mood);

      var media = el("div", "product-card__media");
      var img = el("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      media.appendChild(img);

      var body = el("div", "product-card__body");

      var label = el("span", "mood-label");
      var dot = el("span", "mood-dot");
      dot.setAttribute("aria-hidden", "true");
      label.appendChild(dot);
      label.appendChild(document.createTextNode(moodLabel(p.mood)));

      var name = el("h3", "product-card__name", p.name);

      var metaParts = [TYPE_LABELS[p.type] || p.type];
      if (p.size) metaParts.push(p.size);
      var meta = el("p", "product-card__meta", metaParts.join(" • "));

      var desc = el("p", "product-card__desc", p.description);

      var foot = el("div", "product-card__foot");
      var price = el("span", "price", formatPrice(p.price));
      price.appendChild(el("small", null, "บาท"));
      var buy = el("a", "btn btn--gold", "สั่งซื้อ");
      buy.href = buildOrderUrl(p);
      foot.appendChild(price);
      foot.appendChild(buy);

      body.appendChild(label);
      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(desc);
      body.appendChild(foot);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function renderProducts() {
      list.textContent = "";
      var shown = products.filter(function (p) {
        return activeMood === "all" || p.mood === activeMood;
      });

      if (!shown.length) {
        list.appendChild(el("p", "text-muted", "ไม่พบสินค้าในหมวดนี้"));
        return;
      }
      shown.forEach(function (p) {
        list.appendChild(buildCard(p));
      });
    }

    buildFilterBar();
    syncFilterBar();

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        renderProducts();
      })
      .catch(function (err) {
        console.error("โหลด products.json ไม่สำเร็จ:", err);
        list.textContent = "";
        list.appendChild(
          el("p", "text-muted", "ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง")
        );
      });
  }

  /* ==========================================================================
     order.html
     ========================================================================== */

  function initOrderPage() {
    var form = byId("orderForm");
    if (!form) return;

    var itemsEl = byId("items");
    var totalEl = byId("total");

    // เติม #items และ #total จาก URL เสมอ (ถ้าไม่มีค่า จะเติมค่าว่าง)
    var params = new URLSearchParams(window.location.search);
    var item = (params.get("item") || "").trim();
    var priceRaw = (params.get("price") || "").trim();
    var priceNum = Number(priceRaw);
    var total = priceRaw !== "" && isFinite(priceNum) ? String(priceNum) : "";

    writeValue(itemsEl, item);
    writeValue(totalEl, total);

    function field(name) {
      return form.elements[name] || null;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      var totalText = readValue(totalEl);
      var totalNum = Number(totalText);

      var payload = {
        customerName: readValue(field("customerName")),
        contact: readValue(field("contact")),
        items: readValue(itemsEl),
        total: totalText !== "" && isFinite(totalNum) ? totalNum : totalText,
        note: readValue(field("note")),
        timestamp: new Date().toISOString()
      };

      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        var orders = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(orders)) orders = [];
        orders.push(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      } catch (err) {
        console.error("บันทึกคำสั่งซื้อไม่สำเร็จ:", err);
        alert("ไม่สามารถบันทึกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      window.location.href = "thankyou.html";
    });
  }

  /* ==========================================================================
     admin.html
     ========================================================================== */

  function initAdminPage() {
    var table = byId("ordersTable");
    if (!table) return;

    var tbody = table.querySelector("tbody");
    if (!tbody) return;

    var orders = [];
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      orders = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("อ่านคำสั่งซื้อไม่สำเร็จ:", err);
      orders = [];
    }

    tbody.textContent = "";

    if (!orders.length) {
      var emptyRow = el("tr");
      var cell = el("td", "text-center text-muted", "ยังไม่มีคำสั่งซื้อ");
      var cols = table.querySelectorAll("thead th").length || 6;
      cell.colSpan = cols;
      emptyRow.appendChild(cell);
      tbody.appendChild(emptyRow);
      return;
    }

    // ล่าสุดขึ้นก่อน
    orders = orders.slice().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    orders.forEach(function (o) {
      var tr = el("tr");
      var date = new Date(o.timestamp);
      var dateText = isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
      var totalNum = Number(o.total);
      var totalText =
        o.total !== "" && o.total != null && isFinite(totalNum)
          ? formatPrice(totalNum) + " บาท"
          : "-";

      [
        dateText,
        o.customerName || "-",
        o.contact || "-",
        o.items || "-",
        totalText,
        o.note || "-"
      ].forEach(function (text) {
        tr.appendChild(el("td", null, text));
      });

      tbody.appendChild(tr);
    });
  }

  /* ---------- Boot ---------- */

  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
