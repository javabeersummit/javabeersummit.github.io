/* ============================================================
   Java Beer Summit — page renderer
   Reads /data/manifest.json + /data/<year>.json and renders the
   page. The year comes from the URL path: "/" is the latest
   edition, "/2025/" is an archive.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  /* Escapes text but turns markdown-style [label](https://url) into links.
     Used for prose fields (e.g. the about intro) that may reference URLs. */
  function escWithLinks(s) {
    var str = String(s == null ? "" : s);
    var re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
    var out = "", last = 0, m;
    while ((m = re.exec(str)) !== null) {
      out += esc(str.slice(last, m.index)) +
        '<a href="' + esc(m[2]) + '" target="_blank" rel="noopener">' + esc(m[1]) + "</a>";
      last = re.lastIndex;
    }
    return out + esc(str.slice(last));
  }

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  function eventDateIsSet(date) {
    if (!date || date === "TBA") return false;
    return !isNaN(new Date(date + "T12:00:00").getTime());
  }

  function formatDate(iso) {
    if (!eventDateIsSet(iso)) return "TBA";
    return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  }

  /* "upcoming" until the end of the event day, then "past".
     statusOverride in the JSON wins if set. */
  function computeStatus(data) {
    if (data.statusOverride === "upcoming" || data.statusOverride === "past") {
      return data.statusOverride;
    }
    if (!eventDateIsSet(data.date)) return "upcoming";
    var end = new Date(data.date + "T23:59:59");
    return Date.now() <= end.getTime() ? "upcoming" : "past";
  }

  function cfpIsOpen(data, status) {
    if (status !== "upcoming" || !data.cfp || !data.cfp.url) return false;
    if (!data.cfp.deadline) return true;
    return Date.now() <= new Date(data.cfp.deadline + "T23:59:59").getTime();
  }

  /* ---------- header: nav + year switcher ---------- */

  function renderNav(data, status) {
    var items = [
      ["#about", "About"],
      ["#schedule", "Schedule"],
      ["#sponsors", "Sponsors"],
      ["#location", "Location"]
    ];
    if (data.gallery && data.gallery.photos && data.gallery.photos.length) {
      items.push(["#gallery", "Gallery"]);
    }
    /* CFP + Register sit at the end as button-like CTAs: Register is the solid
       primary, CFP an outlined secondary so the two don't compete */
    if (status === "upcoming") {
      if (data.cfp && data.cfp.url) items.push(["#cfp", "CFP", "nav-cta nav-cta-ghost"]);
      if (data.registration && data.registration.url) items.push(["#register", "Register", "nav-cta"]);
    }
    document.getElementById("site-nav").innerHTML = items.map(function (it) {
      return '<a href="' + it[0] + '"' + (it[2] ? ' class="' + it[2] + '"' : "") + ">" + it[1] + "</a>";
    }).join("");
  }

  function yearHref(manifest, year) {
    return year === manifest.latest ? "/" : "/" + year + "/";
  }

  function renderYearSwitcher(manifest, currentYear) {
    var sel = document.getElementById("year-select");
    sel.innerHTML = manifest.years.map(function (y) {
      var label = y === manifest.latest ? y + " ✦" : y;
      return '<option value="' + y + '"' + (y === currentYear ? " selected" : "") + ">" +
        label + "</option>";
    }).join("");
    sel.addEventListener("change", function () {
      window.location.href = yearHref(manifest, Number(sel.value));
    });
  }

  function renderBanner(manifest, data, status) {
    if (status !== "past") return;
    document.getElementById("archive-banner").innerHTML =
      '<div class="archive-banner">📦 You are browsing the <strong>' + data.year +
      '</strong> archive — <a href="/">jump to the ' + manifest.latest + " edition</a></div>";
  }

  /* ---------- hero decorations ---------- */

  var DEFAULT_HERO_IMAGE = "/assets/hero-bg-borisova-beer-v3.jpg";
  var DEFAULT_HERO_POSITION = "center 42%";

  function heroBgStyle(data) {
    var img = (data.heroImage && data.heroImage.trim()) || DEFAULT_HERO_IMAGE;
    var pos = (data.heroImagePosition && data.heroImagePosition.trim()) || DEFAULT_HERO_POSITION;
    return "--hero-image:url('" + img + "');--hero-position:" + pos;
  }

  /* [left %, size px, duration s, delay s] for the carbonation bubbles */
  var BUBBLES = [
    [8, 10, 7, 0], [16, 6, 9, 2.5], [27, 12, 6, 1], [38, 7, 8, 3.6],
    [47, 9, 7, 0.6], [55, 5, 9, 2], [63, 11, 6, 4], [72, 7, 7, 1.4],
    [81, 10, 8, 3], [90, 6, 6, 0.2], [33, 5, 10, 5], [68, 5, 10, 5.8]
  ];

  function bubblesHTML() {
    return BUBBLES.map(function (b) {
      return '<span style="left:' + b[0] + "%;width:" + b[1] + "px;height:" + b[1] +
        "px;animation-duration:" + b[2] + "s;animation-delay:" + b[3] + 's"></span>';
    }).join("");
  }

  function clinkSVG() {
    return (
      '<svg viewBox="0 0 360 195" aria-hidden="true" focusable="false">' +
      '<text class="toast-txt" x="180" y="34" text-anchor="middle">Наздраве!</text>' +
      '<g class="splash">' +
      '<circle cx="180" cy="76" r="5"/><circle cx="163" cy="64" r="3.5"/>' +
      '<circle cx="197" cy="62" r="4"/><circle cx="174" cy="52" r="2.5"/>' +
      '<circle cx="190" cy="84" r="3"/>' +
      '<path d="M156 80 L148 74 M204 78 L212 72 M180 46 L180 36"/>' +
      "</g>" +
      '<g class="mug mugL">' +
      '<path class="handle" d="M72 92 h-24 a17 17 0 0 0 0 38 h24"/>' +
      '<rect class="glass" x="70" y="70" width="84" height="100" rx="10"/>' +
      '<rect class="beer" x="78" y="90" width="68" height="72" rx="6"/>' +
      '<circle class="foam-c" cx="86" cy="78" r="11"/><circle class="foam-c" cx="111" cy="71" r="14"/><circle class="foam-c" cx="137" cy="78" r="11"/>' +
      '<rect class="foam-r" x="74" y="74" width="76" height="12"/>' +
      "</g>" +
      '<g class="mug mugR">' +
      '<path class="handle" d="M288 92 h24 a17 17 0 0 1 0 38 h-24"/>' +
      '<rect class="glass" x="206" y="70" width="84" height="100" rx="10"/>' +
      '<rect class="beer" x="214" y="90" width="68" height="72" rx="6"/>' +
      '<circle class="foam-c" cx="222" cy="78" r="11"/><circle class="foam-c" cx="248" cy="71" r="14"/><circle class="foam-c" cx="274" cy="78" r="11"/>' +
      '<rect class="foam-r" x="210" y="74" width="76" height="12"/>' +
      "</g></svg>"
    );
  }

  /* ---------- sections ---------- */

  function heroHTML(data, status) {
    var ctas = "";
    if (status === "upcoming") {
      ctas =
        '<div class="hero-ctas">' +
        (data.registration && data.registration.url
          ? '<a class="btn btn-primary" href="' + esc(data.registration.url) + '" target="_blank" rel="noopener">🎟 Register — it’s free</a>'
          : "") +
        (cfpIsOpen(data, status)
          ? '<a class="btn btn-secondary" href="' + esc(data.cfp.url) + '" target="_blank" rel="noopener">🎤 Submit a talk</a>'
          : "") +
        "</div>" +
        (eventDateIsSet(data.date)
          ? '<div class="countdown" id="countdown" aria-label="Countdown to the event"></div>'
          : "");
    } else {
      var gallery = data.gallery && data.gallery.photos && data.gallery.photos.length;
      ctas =
        '<div class="hero-ctas">' +
        (gallery ? '<a class="btn btn-primary" href="#gallery">📸 Relive it — photos</a>' : "") +
        '<a class="btn btn-secondary" href="#schedule">What happened</a>' +
        "</div>" +
        '<p class="hero-over">// this edition is a wrap — thanks for coming! 🍻</p>';
    }

    return (
      '<section class="hero" id="home">' +
      '<div class="hero-bg" aria-hidden="true" style="' + heroBgStyle(data) + '">' + bubblesHTML() + "</div>" +
      '<div class="wrap">' +
      '<p class="hero-kicker">' +
      '<span class="chip">📅 ' + esc(formatDate(data.date)) + "</span>" +
      '<span class="chip">📍 ' + esc(data.location.name) + ", " + esc(data.location.city) + "</span>" +
      '<span class="chip">🍺 doors ' + esc(data.doorsOpen) + "</span>" +
      "</p>" +
      "<h1>" + esc(data.title) + ' <span class="year">' + data.year + "</span></h1>" +
      '<p class="hero-tagline">' + esc(data.tagline) + "</p>" +
      '<div class="clink" id="hero-clink" role="img" aria-label="Two beer mugs clinking — Наздраве!" title="Click for another round">' +
      clinkSVG() + "</div>" +
      ctas +
      "</div>" +
      '<svg class="foam" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0,52 C180,66 360,44 540,56 C720,68 900,46 1080,58 C1260,70 1350,54 1440,62 L1440,70 L0,70 Z"/>' +
      "</svg>" +
      "</section>"
    );
  }

  function aboutHTML(data) {
    var cards = (data.about.highlights || []).map(function (h) {
      return (
        '<div class="highlight">' +
        '<span class="icon" aria-hidden="true">' + esc(h.icon) + "</span>" +
        "<h3>" + esc(h.title) + "</h3>" +
        "<p>" + esc(h.text) + "</p>" +
        "</div>"
      );
    }).join("");
    var orgs = (data.organizers || []).map(function (o) {
      return (
        '<a class="sponsor-card org-card" href="' + esc(o.url) +
        '" target="_blank" rel="noopener">' +
        '<img src="' + esc(o.logo) + '" alt="' + esc(o.name) + '" loading="lazy" />' +
        "</a>"
      );
    }).join("");
    return (
      '<section class="section" id="about"><div class="wrap">' +
      sectionHead("about", "What is this?") +
      '<p class="about-intro">' + escWithLinks(data.about.intro) + "</p>" +
      '<div class="highlight-grid">' + cards + "</div>" +
      (orgs
        ? '<div class="organizers"><p class="tier-name">Organized by</p><div class="sponsor-grid">' + orgs + "</div></div>"
        : "") +
      "</div></section>"
    );
  }

  function buildSchedulePhases(schedule) {
    var phases = [];
    var current = null;

    schedule.forEach(function (item, i) {
      var label = null;
      var prev = i > 0 ? schedule[i - 1] : null;

      if (i === 0) {
        label = item.type === "break" ? "Doors & welcome"
          : item.type === "lightning" ? "Lightning round"
          : "Talks";
      } else if (item.type === "lightning" && prev.type !== "lightning") {
        label = "Lightning round";
      } else if (item.type === "talk" && prev.type === "break") {
        var talksBefore = schedule.slice(0, i).some(function (x) { return x.type === "talk"; });
        label = talksBefore ? "Back on stage" : "Talks";
      } else if (item.type === "break" && i === schedule.length - 1) {
        label = "Wind-down";
      }

      if (label) {
        current = { label: label, items: [] };
        phases.push(current);
      }
      if (!current) {
        current = { label: "Schedule", items: [] };
        phases.push(current);
      }
      current.items.push(item);
    });

    return phases;
  }

  function scheduleItemHTML(item) {
    var type = item.type || "talk";
    var isBreak = type === "break";
    var nodeClass = isBreak ? "timeline-node-break"
      : type === "lightning" ? "timeline-node-lightning"
      : "timeline-node-talk";

    if (isBreak) {
      return (
        '<li class="timeline-slot is-break">' +
        '<span class="timeline-node ' + nodeClass + '" aria-hidden="true"></span>' +
        '<span class="slot-time">' + esc(item.time) + "</span>" +
        '<div class="timeline-break">' +
        "<h3>" + esc(item.title) + "</h3>" +
        (item.abstract ? '<p class="abstract">' + esc(item.abstract) + "</p>" : "") +
        "</div></li>"
      );
    }

    var badge = type === "lightning"
      ? '<span class="badge badge-lightning">lightning</span>'
      : '<span class="badge badge-talk">talk</span>';
    var cardClass = type === "lightning"
      ? "timeline-card timeline-card-lightning"
      : "timeline-card timeline-card-talk";

    return (
      '<li class="timeline-slot is-' + type + '">' +
      '<span class="timeline-node ' + nodeClass + '" aria-hidden="true"></span>' +
      '<span class="slot-time">' + esc(item.time) + "</span>" +
      '<div class="' + cardClass + '">' +
      '<div class="timeline-card-body">' + badge +
      '<div class="timeline-card-text">' +
      "<h3>" + esc(item.title) + "</h3>" +
      (item.speaker ? '<p class="speaker">' + esc(item.speaker) + "</p>" : "") +
      (item.abstract ? '<p class="abstract">' + esc(item.abstract) + "</p>" : "") +
      "</div></div></div></li>"
    );
  }

  function scheduleHTML(data, status) {
    var body;
    if (!data.schedule || !data.schedule.length) {
      if (status !== "upcoming") return "";
      body =
        '<div class="schedule-empty">' +
        "<p>Schedule TBA.</p>" +
        (cfpIsOpen(data, status)
          ? '<a class="btn btn-secondary" href="#cfp">Submit a talk</a>'
          : "") +
        "</div>";
    } else {
      var doors = data.doorsOpen
        ? '<p class="schedule-doors"><span class="schedule-doors-icon" aria-hidden="true">🚪</span>' +
          'Doors open <strong class="mono">' + esc(data.doorsOpen) + "</strong></p>"
        : "";
      var phases = buildSchedulePhases(data.schedule);
      body = doors + '<div class="timeline-track">' + phases.map(function (phase) {
        return (
          '<section class="timeline-phase">' +
          '<h3 class="timeline-phase-label">' + esc(phase.label) + "</h3>" +
          '<ol class="timeline">' +
          phase.items.map(scheduleItemHTML).join("") +
          "</ol></section>"
        );
      }).join("") + "</div>";
    }
    return (
      '<section class="section section-alt" id="schedule"><div class="wrap">' +
      sectionHead("schedule", status === "upcoming" ? "The line-up" : "How the evening went") +
      body +
      "</div></section>"
    );
  }

  var TIER_ORDER = ["gold", "silver", "community"];

  function sponsorCard(s) {
    return (
      '<a class="sponsor-card" href="' + esc(s.url) +
      '" target="_blank" rel="noopener">' +
      '<img src="' + esc(s.logo) + '" alt="' + esc(s.name) + '" loading="lazy" />' +
      "</a>"
    );
  }

  function sponsorsHTML(data, status) {
    var sponsors = data.sponsors || [];
    /* the tier field is optional — known tiers render in TIER_ORDER with a
       heading, untiered sponsors render as one plain grid */
    var tierNames = [];
    sponsors.forEach(function (s) {
      var t = s.tier || "";
      if (tierNames.indexOf(t) === -1) tierNames.push(t);
    });
    tierNames.sort(function (a, b) {
      var ia = TIER_ORDER.indexOf(a), ib = TIER_ORDER.indexOf(b);
      return (ia === -1 ? TIER_ORDER.length : ia) - (ib === -1 ? TIER_ORDER.length : ib);
    });
    var tiers = tierNames.map(function (t) {
      var cards = sponsors.filter(function (s) { return (s.tier || "") === t; })
        .map(sponsorCard).join("");
      return (
        '<div class="tier' + (t ? " tier-" + esc(t) : "") + '">' +
        (t ? '<p class="tier-name">' + esc(t) + "</p>" : "") +
        '<div class="sponsor-grid">' + cards + "</div></div>"
      );
    }).join("");

    var packages = packagesHTML(data, status);
    var cta = "";
    if (!packages && status === "upcoming" && data.sponsorContact) {
      cta = '<p class="sponsor-cta">Want your logo here, on the cups and in a few hundred developers’ good books? ' +
        '<a href="mailto:' + esc(data.sponsorContact) + '">Become a sponsor</a>.</p>';
    }

    return (
      '<section class="section" id="sponsors"><div class="wrap">' +
      sectionHead("sponsors", status === "upcoming" ? "Brought to you by" : "The " + data.year + " sponsors") +
      (tiers || '<p class="sponsor-cta">Sponsors TBA.</p>') +
      cta +
      packages +
      "</div></section>"
    );
  }

  /* Sponsorship packages — upcoming editions only, and only while
     sponsorPackages.show is true in the year's JSON. Flip it to false
     to hide the whole block once the line-up of sponsors is settled. */
  function packagesHTML(data, status) {
    var sp = data.sponsorPackages;
    if (status !== "upcoming" || !sp || !sp.show || !(sp.packages || []).length) return "";

    var cards = sp.packages.map(function (p) {
      /* prefer the partners form if one is set; otherwise fall back to a
         pre-filled email to sponsorContact */
      var href = sp.formUrl
        ? esc(sp.formUrl)
        : (data.sponsorContact
            ? "mailto:" + esc(data.sponsorContact) +
              "?subject=" + encodeURIComponent(data.title + " " + data.year + " — " + p.name + " sponsorship")
            : "");
      var external = sp.formUrl ? ' target="_blank" rel="noopener"' : "";
      return (
        '<div class="package' + (p.featured ? " is-featured" : "") + '">' +
        (p.featured ? '<span class="package-flag">🍺 most poured</span>' : "") +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="package-price">' + esc(p.price) + "</p>" +
        '<ul class="package-perks">' +
        (p.perks || []).map(function (perk) { return "<li>" + esc(perk) + "</li>"; }).join("") +
        "</ul>" +
        (href ? '<a class="btn ' + (p.featured ? "btn-primary" : "btn-secondary") + '" href="' + href + '"' + external + ">Become a partner</a>" : "") +
        "</div>"
      );
    }).join("");

    return (
      '<div class="packages" id="packages">' +
      '<h3 class="packages-title">Sponsorship packages</h3>' +
      (sp.intro ? '<p class="packages-intro">' + esc(sp.intro) + "</p>" : "") +
      '<div class="package-grid">' + cards + "</div></div>"
    );
  }

  function locationHTML(data) {
    var loc = data.location;
    return (
      '<section class="section section-alt" id="location"><div class="wrap">' +
      sectionHead("location", "Where the magic happens") +
      '<div class="location-grid">' +
      '<div class="location-info">' +
      "<h3>" + esc(loc.name) + "</h3>" +
      '<p class="city">📍 ' + esc(loc.address) + " · " + esc(loc.city) + "</p>" +
      "<p>" + esc(loc.description) + "</p>" +
      (loc.directions ? '<p class="directions">🧭 ' + esc(loc.directions) + "</p>" : "") +
      (loc.mapLink ? '<p class="map-link"><a href="' + esc(loc.mapLink) + '" target="_blank" rel="noopener">open in Google Maps ↗</a></p>' : "") +
      "</div>" +
      (loc.mapEmbed ? '<div class="map-frame"><iframe src="' + esc(loc.mapEmbed) + '" title="Map of ' + esc(loc.name) + '" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>' : "") +
      "</div></div></section>"
    );
  }

  function ctaSectionsHTML(data, status) {
    if (status !== "upcoming") return "";
    var hasCfp = data.cfp && data.cfp.url;
    var hasReg = data.registration && data.registration.url;
    if (!hasCfp && !hasReg) return "";
    var cfpOpen = cfpIsOpen(data, status);
    return (
      '<section class="section" id="cfp"><div class="wrap">' +
      sectionHead("speak &amp; attend", "Be part of it") +
      '<div class="cta-grid">' +
      (hasCfp
        ? '<div class="cta-card' + (cfpOpen ? "" : " is-closed") + '" id="cfp-card">' +
          "<h2>🎤 Call for papers</h2>" +
          (data.cfp.deadline ? '<p class="deadline">deadline: ' + esc(formatDate(data.cfp.deadline)) + "</p>" : "") +
          "<p>" + esc(data.cfp.note) + "</p>" +
          (cfpOpen
            ? '<a class="btn btn-primary" href="' + esc(data.cfp.url) + '" target="_blank" rel="noopener">Submit your talk</a>'
            : '<span class="btn btn-primary" aria-disabled="true">CFP is closed</span>') +
          "</div>"
        : "") +
      (hasReg
        ? '<div class="cta-card" id="register">' +
          "<h2>🎟 Registration</h2>" +
          '<p class="deadline">free entry · limited capacity</p>' +
          "<p>" + esc(data.registration.note) + "</p>" +
          '<a class="btn btn-primary" href="' + esc(data.registration.url) + '" target="_blank" rel="noopener">Grab a spot</a>' +
          "</div>"
        : "") +
      "</div></div></section>"
    );
  }

  function galleryHTML(data) {
    var g = data.gallery;
    if (!g || !g.photos || !g.photos.length) return "";
    var photos = g.photos.map(function (src, i) {
      return (
        '<button type="button" data-photo-index="' + i + '">' +
        '<img src="' + esc(src) + '" alt="Java Beer Summit ' + data.year + " — photo " + (i + 1) + '" loading="lazy" />' +
        "</button>"
      );
    }).join("");
    /* Local video clips live in the same masonry grid as the photos, so they
       sit vertically alongside them. They play muted on hover and keep native
       controls (so unmuting / pausing stays available). YouTube clips, which
       can't autoplay-on-hover as cleanly, still render as embedded iframes. */
    var localVideos = (g.videos || []).filter(function (v) { return v.src; });
    var embedVideos = (g.videos || []).filter(function (v) { return !v.src && v.youtubeId; });
    var videoTiles = localVideos.map(function (v) {
      return (
        '<div class="video-tile">' +
        '<video src="' + esc(v.src) + '"' +
        (v.poster ? ' poster="' + esc(v.poster) + '"' : "") +
        ' muted loop playsinline controls preload="metadata"' +
        ' aria-label="' + esc(v.title) + '"></video>' +
        "</div>"
      );
    }).join("");
    var embeds = embedVideos.map(function (v) {
      return (
        '<div class="video-card">' +
        "<h3>🎬 " + esc(v.title) + "</h3>" +
        '<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(v.youtubeId) +
        '" title="' + esc(v.title) + '" loading="lazy" allowfullscreen></iframe></div>' +
        "</div>"
      );
    }).join("");
    return (
      '<section class="section section-alt" id="gallery"><div class="wrap">' +
      sectionHead("gallery", "Proof it happened") +
      '<div class="photo-grid" id="photo-grid">' + videoTiles + photos + "</div>" +
      (embeds ? '<div class="video-grid">' + embeds + "</div>" : "") +
      "</div></section>"
    );
  }

  function sectionHead(eyebrow, title) {
    return (
      '<div class="section-head">' +
      '<span class="eyebrow">// ' + eyebrow + "</span>" +
      "<h2>" + title + "</h2></div>"
    );
  }

  function footerHTML(manifest, data) {
    var editions = manifest.years.map(function (y) {
      return '<a href="' + yearHref(manifest, y) + '">' + y + "</a>";
    }).join(" · ");
    return (
      '<div class="wrap footer-inner">' +
      "<div>🍺 <strong>Java Beer Summit</strong> — community-run, since " +
      manifest.years[manifest.years.length - 1] + "<br/>Editions: " + editions + "</div>" +
      '<div class="mono">while(summer) { talk(); drink(); }</div>' +
      "</div>"
    );
  }

  /* ---------- clink animation ---------- */

  var clinkPlay = null;

  function initClink() {
    var c = document.getElementById("hero-clink");
    if (!c) return;
    clinkPlay = function () {
      c.classList.remove("play");
      void c.offsetWidth;
      c.classList.add("play");
    };
    c.addEventListener("click", clinkPlay);
    setTimeout(clinkPlay, 600);
  }

  /* ---------- countdown ---------- */

  function initCountdown(data, status) {
    var el = document.getElementById("countdown");
    if (!el || status !== "upcoming" || !eventDateIsSet(data.date)) return;
    var target = new Date(data.date + "T" + (data.doorsOpen || "18:00") + ":00").getTime();

    el.innerHTML = ["days", "hours", "min", "sec"].map(function (l) {
      return '<div class="cell"><span class="num">--</span><span class="lbl">' + l + "</span></div>";
    }).join("");
    var nums = [].slice.call(el.querySelectorAll(".num"));
    var prev = [null, null, null, null];

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        el.outerHTML = '<p class="hero-over">🍻 Happening right now — see you in the park!</p>';
        clearInterval(timer);
        if (clinkPlay) clinkPlay();
        return;
      }
      var vals = [
        Math.floor(diff / 864e5),
        Math.floor(diff % 864e5 / 36e5),
        Math.floor(diff % 36e5 / 6e4),
        Math.floor(diff % 6e4 / 1e3)
      ];
      vals.forEach(function (v, i) {
        var s = String(v).padStart(2, "0");
        if (s === prev[i]) return;
        prev[i] = s;
        nums[i].textContent = s;
        nums[i].classList.remove("tick");
        void nums[i].offsetWidth;
        nums[i].classList.add("tick");
      });
    }
    tick();
    var timer = setInterval(tick, 1000);
  }

  /* ---------- scroll-reveal ---------- */

  function initReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    var targets = document.querySelectorAll(
      ".section-head, .about-intro, .highlight, .sponsor-card, .package, .cta-card, " +
      ".timeline-slot, .timeline-phase-label, .schedule-doors, .schedule-empty, " +
      ".photo-grid button, .video-card, .location-grid > *"
    );
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (t) {
      var idx = Array.prototype.indexOf.call(t.parentNode.children, t);
      t.classList.add("reveal");
      t.style.transitionDelay = (idx % 6) * 70 + "ms";
      /* drop the reveal classes afterwards so hover transitions
         (sponsor cards etc.) get their own timing back */
      t.addEventListener("transitionend", function done() {
        t.classList.remove("reveal", "is-in");
        t.style.transitionDelay = "";
        t.removeEventListener("transitionend", done);
      });
      io.observe(t);
    });
  }

  /* ---------- beer-glass scroll progress ---------- */

  function initScrollProgress() {
    var bar = document.createElement("div");
    bar.className = "beer-progress";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = '<div class="fill"></div><div class="cap"></div>';
    document.body.appendChild(bar);
    var fill = bar.firstChild;
    var cap = bar.lastChild;
    var raf = null;

    function update() {
      raf = null;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      fill.style.transform = "scaleX(" + p + ")";
      cap.style.transform = "translateX(" + p * window.innerWidth + "px)";
      cap.style.opacity = p > 0.002 ? "1" : "0";
    }
    function queue() { if (!raf) raf = requestAnimationFrame(update); }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    update();
  }

  /* ---------- string lights ---------- */

  function initStringLights() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var div = document.createElement("div");
    div.className = "string-lights";
    div.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 16; i++) div.appendChild(document.createElement("span"));
    header.appendChild(div);
  }

  /* ---------- gallery video tiles: play (muted) on hover ---------- */

  function initGalleryVideos() {
    var vids = document.querySelectorAll(".video-tile video");
    Array.prototype.forEach.call(vids, function (v) {
      v.addEventListener("mouseenter", function () {
        var p = v.play();
        if (p && p.catch) p.catch(function () {}); /* ignore autoplay rejections */
      });
      v.addEventListener("mouseleave", function () {
        /* don't fight a viewer who unmuted and is watching with sound */
        if (v.muted) v.pause();
      });
    });
  }

  /* ---------- lightbox ---------- */

  function initLightbox(data) {
    var grid = document.getElementById("photo-grid");
    var box = document.getElementById("lightbox");
    if (!grid || !box || !box.showModal) return;
    var img = document.getElementById("lightbox-img");
    var photos = data.gallery.photos;
    var index = 0;

    function show(i) {
      index = (i + photos.length) % photos.length;
      img.src = photos[index];
      img.alt = "Java Beer Summit " + data.year + " — photo " + (index + 1) + " of " + photos.length;
    }

    grid.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-photo-index]");
      if (!btn) return;
      show(Number(btn.dataset.photoIndex));
      box.showModal();
    });
    box.querySelector("[data-lightbox-prev]").addEventListener("click", function () { show(index - 1); });
    box.querySelector("[data-lightbox-next]").addEventListener("click", function () { show(index + 1); });
    box.querySelector("[data-lightbox-close]").addEventListener("click", function () { box.close(); });
    box.addEventListener("click", function (e) { if (e.target === box) box.close(); });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  /* ---------- boot ---------- */

  function boot() {
    var main = document.getElementById("main");

    var pathYear = window.location.pathname.match(/^\/(\d{4})(\/|$)/);

    fetchJSON("/data/manifest.json").then(function (manifest) {
      var year = pathYear ? Number(pathYear[1]) : manifest.latest;
      return fetchJSON("/data/" + year + ".json").then(function (data) {
        var status = computeStatus(data);

        document.title = data.title + " " + data.year + " — " + data.location.city;

        renderYearSwitcher(manifest, year);
        renderNav(data, status);
        renderBanner(manifest, data, status);

        main.innerHTML =
          heroHTML(data, status) +
          aboutHTML(data) +
          scheduleHTML(data, status) +
          ctaSectionsHTML(data, status) +
          sponsorsHTML(data, status) +
          locationHTML(data) +
          galleryHTML(data);
        main.removeAttribute("aria-busy");

        document.getElementById("site-footer").innerHTML = footerHTML(manifest, data);

        initClink();
        initCountdown(data, status);
        initLightbox(data);
        initGalleryVideos();
        initReveal();
        initScrollProgress();
        initStringLights();
      });
    }).catch(function (err) {
      main.removeAttribute("aria-busy");
      main.innerHTML =
        '<div class="wrap notfound"><p class="notfound-code">// error</p>' +
        "<h1>Something spilled.</h1><p>" + esc(err.message) + "</p>" +
        '<p>If you are previewing locally, serve the folder over HTTP (e.g. <code class="mono">python3 -m http.server</code>) — opening the file directly blocks data loading.</p></div>';
    });
  }

  boot();
})();
