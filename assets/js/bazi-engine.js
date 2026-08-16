/*
 * bazi-engine.js — 四柱 (four pillars) from a birth moment, in plain JS.
 *
 * No lookup tables of solar terms: the twelve 節 that bound the months are the
 * instants when the sun's apparent longitude crosses 315°, 345°, 15°, … , so
 * we compute the sun's position directly (Meeus) and solve for the crossing.
 * Good to a couple of minutes over 1900–2100, which is finer than the
 * uncertainty in most people's recorded birth time.
 *
 * Also exported: the five-element weighing that the landscape painter reads.
 *
 * Loadable both in the browser (window.BaziEngine) and in node (require), so
 * the arithmetic can be tested without a browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BaziEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Cyclic characters
   * ------------------------------------------------------------------ */

  var STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  var STEM_PINYIN = ['jiǎ', 'yǐ', 'bǐng', 'dīng', 'wù', 'jǐ', 'gēng', 'xīn', 'rén', 'guǐ'];
  var BRANCH_PINYIN = ['zǐ', 'chǒu', 'yín', 'mǎo', 'chén', 'sì', 'wǔ', 'wèi', 'shēn', 'yǒu', 'xū', 'hài'];

  /* Elements are indexed in the generating order 木 火 土 金 水, so that
     "x generates y" is (x+1)%5 and "x controls y" is (x+2)%5. */
  var ELEMENTS = ['木', '火', '土', '金', '水'];
  var ELEMENT_EN = ['wood', 'fire', 'earth', 'metal', 'water'];

  var STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

  /* 藏干: the stems hidden inside each branch, with their weights. Each branch
     carries a total of 1.2 — 本气 / 中气 / 余气 split 0.6 / 0.25 / 0.15. */
  var HIDDEN = [
    [[9, 1.20]],                          /* 子 癸 */
    [[5, 0.72], [9, 0.30], [7, 0.18]],    /* 丑 己癸辛 */
    [[0, 0.72], [2, 0.30], [4, 0.18]],    /* 寅 甲丙戊 */
    [[1, 1.20]],                          /* 卯 乙 */
    [[4, 0.72], [1, 0.30], [9, 0.18]],    /* 辰 戊乙癸 */
    [[2, 0.72], [6, 0.30], [4, 0.18]],    /* 巳 丙庚戊 */
    [[3, 0.84], [5, 0.36]],               /* 午 丁己 */
    [[5, 0.72], [3, 0.30], [1, 0.18]],    /* 未 己丁乙 */
    [[6, 0.72], [8, 0.30], [4, 0.18]],    /* 申 庚壬戊 */
    [[7, 1.20]],                          /* 酉 辛 */
    [[4, 0.72], [7, 0.30], [3, 0.18]],    /* 戌 戊辛丁 */
    [[8, 0.84], [0, 0.36]]                /* 亥 壬甲 */
  ];

  var SEASON = ['冬', '冬', '春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬'];
  var SEASON_EN = ['winter', 'winter', 'spring', 'spring', 'spring',
    'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];

  /* 六冲 pairs are simply the branches six apart; 六合 and 三合 are listed. */
  var SIX_HARMONY = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  var TRIADS = [
    { members: [8, 0, 4], element: 4, name: '申子辰' },
    { members: [11, 3, 7], element: 0, name: '亥卯未' },
    { members: [2, 6, 10], element: 1, name: '寅午戌' },
    { members: [5, 9, 1], element: 3, name: '巳酉丑' }
  ];
  var STEM_HARMONY = [
    { members: [0, 5], element: 2, name: '甲己合' },
    { members: [1, 6], element: 3, name: '乙庚合' },
    { members: [2, 7], element: 4, name: '丙辛合' },
    { members: [3, 8], element: 0, name: '丁壬合' },
    { members: [4, 9], element: 1, name: '戊癸合' }
  ];

  /* 十神, indexed [relation][samePolarity ? 0 : 1]. */
  var TEN_GODS = {
    same: ['比肩', '劫财'],
    output: ['食神', '伤官'],   /* 我生 */
    wealth: ['偏财', '正财'],   /* 我克 */
    officer: ['七杀', '正官'],  /* 克我 */
    resource: ['偏印', '正印']  /* 生我 */
  };

  /* ------------------------------------------------------------------ *
   * Calendar and solar arithmetic
   * ------------------------------------------------------------------ */

  var D2R = Math.PI / 180;

  function mod(a, n) { return ((a % n) + n) % n; }
  function mod360(a) { return mod(a, 360); }

  /* Julian Day for a Gregorian civil moment given in UTC. */
  function julianDay(y, m, d, hours) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) +
      d + B - 1524.5 + (hours || 0) / 24;
  }

  /* Inverse of the above: JD (UTC) back to a civil date. */
  function fromJulianDay(jd) {
    var z = Math.floor(jd + 0.5);
    var f = jd + 0.5 - z;
    var alpha = Math.floor((z - 1867216.25) / 36524.25);
    var a = z < 2299161 ? z : z + 1 + alpha - Math.floor(alpha / 4);
    var b = a + 1524;
    var c = Math.floor((b - 122.1) / 365.25);
    var d = Math.floor(365.25 * c);
    var e = Math.floor((b - d) / 30.6001);
    var dayFrac = b - d - Math.floor(30.6001 * e) + f;
    var day = Math.floor(dayFrac);
    var hours = (dayFrac - day) * 24;
    var month = e < 14 ? e - 1 : e - 13;
    var year = month > 2 ? c - 4716 : c - 4715;
    return {
      year: year, month: month, day: day,
      hour: Math.floor(hours),
      minute: Math.floor((hours - Math.floor(hours)) * 60),
      second: Math.round(((hours * 60) % 1) * 60)
    };
  }

  /* ΔT = TT − UT, in seconds. Espenak & Meeus polynomial expressions,
     trimmed to the range this app cares about. */
  function deltaT(year) {
    var t, u;
    if (year < 1900) { u = (year - 1820) / 100; return -20 + 32 * u * u; }
    if (year < 1920) {
      t = year - 1900;
      return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t -
        0.000197 * t * t * t * t;
    }
    if (year < 1941) {
      t = year - 1920;
      return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
    }
    if (year < 1961) {
      t = year - 1950;
      return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547;
    }
    if (year < 1986) {
      t = year - 1975;
      return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718;
    }
    if (year < 2005) {
      t = year - 2000;
      return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t +
        0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5);
    }
    if (year < 2050) {
      t = year - 2000;
      return 62.92 + 0.32217 * t + 0.005589 * t * t;
    }
    u = (year - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - year);
  }

  /* The sun's apparent geocentric longitude, in degrees, for a moment given
     in Terrestrial Time. Equation of centre plus the largest planetary and
     lunar perturbations, then nutation and aberration. */
  function sunLongitude(jdTT) {
    var T = (jdTT - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
      (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
      0.000289 * Math.sin(3 * M);
    var lon = L0 + C;

    /* Perturbations by Venus, Jupiter and the Moon — each a couple of
       thousandths of a degree, together worth a few minutes of clock time
       at a solar-term boundary. */
    var A = (153.23 + 22518.7541 * T) * D2R;
    var B = (216.57 + 45037.5082 * T) * D2R;
    var Cp = (312.69 + 32964.3577 * T) * D2R;
    var D = (350.74 + 445267.1142 * T - 0.00144 * T * T) * D2R;
    var E = (231.19 + 20.20 * T) * D2R;
    lon += 0.00134 * Math.cos(A) + 0.00154 * Math.cos(B) +
      0.00200 * Math.cos(Cp) + 0.00179 * Math.sin(D) + 0.00178 * Math.sin(E);

    var omega = (125.04 - 1934.136 * T) * D2R;
    return mod360(lon - 0.00569 - 0.00478 * Math.sin(omega));
  }

  function obliquity(jdTT) {
    var T = (jdTT - 2451545.0) / 36525;
    var eps0 = 23 + 26 / 60 + 21.448 / 3600 -
      (46.8150 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600;
    var omega = (125.04 - 1934.136 * T) * D2R;
    return eps0 + 0.00256 * Math.cos(omega);
  }

  /* Equation of time in minutes: apparent solar time minus mean solar time. */
  function equationOfTime(jdTT) {
    var T = (jdTT - 2451545.0) / 36525;
    var L0 = mod360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    var eps = obliquity(jdTT) * D2R;
    var lambda = sunLongitude(jdTT) * D2R;
    var alpha = mod360(Math.atan2(Math.cos(eps) * Math.sin(lambda),
      Math.cos(lambda)) / D2R);
    var omega = (125.04 - 1934.136 * T) * D2R;
    var dpsi = -0.00478 * Math.sin(omega);
    var E = L0 - 0.0057183 - alpha + dpsi * Math.cos(eps);
    while (E > 180) E -= 360;
    while (E < -180) E += 360;
    return E * 4;
  }

  /* The 節 that opens each civil month, by target solar longitude, plus the
     branch that month carries and a starting guess for the search. */
  var MONTH_TERM = {
    1: { lon: 285, day: 6, name: '小寒', branch: 1 },
    2: { lon: 315, day: 4, name: '立春', branch: 2 },
    3: { lon: 345, day: 6, name: '惊蛰', branch: 3 },
    4: { lon: 15, day: 5, name: '清明', branch: 4 },
    5: { lon: 45, day: 6, name: '立夏', branch: 5 },
    6: { lon: 75, day: 6, name: '芒种', branch: 6 },
    7: { lon: 105, day: 7, name: '小暑', branch: 7 },
    8: { lon: 135, day: 8, name: '立秋', branch: 8 },
    9: { lon: 165, day: 8, name: '白露', branch: 9 },
    10: { lon: 195, day: 8, name: '寒露', branch: 10 },
    11: { lon: 225, day: 7, name: '立冬', branch: 11 },
    12: { lon: 255, day: 7, name: '大雪', branch: 0 }
  };

  /* JD (UT) of the 節 opening the given civil month. */
  function termJD(year, month) {
    var spec = MONTH_TERM[month];
    var jd = julianDay(year, month, spec.day, 12);   /* guess, treated as TT */
    for (var i = 0; i < 10; i++) {
      var diff = spec.lon - sunLongitude(jd);
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      jd += diff / 0.9856473;
      if (Math.abs(diff) < 1e-7) break;
    }
    return jd - deltaT(year) / 86400;
  }

  /* ------------------------------------------------------------------ *
   * The four pillars
   * ------------------------------------------------------------------ */

  function pillar(stem, branch) {
    return {
      stem: stem, branch: branch,
      stemChar: STEMS[stem], branchChar: BRANCHES[branch],
      text: STEMS[stem] + BRANCHES[branch],
      pinyin: STEM_PINYIN[stem] + ' ' + BRANCH_PINYIN[branch],
      stemElement: STEM_ELEMENT[stem],
      branchElement: BRANCH_ELEMENT[branch]
    };
  }

  /*
   * opts:
   *   year, month, day    civil date as written on the birth record
   *   hour, minute        clock time on that record
   *   tz                  the clock's offset from UTC, in hours (8 = Beijing)
   *   longitude           degrees east, negative west (optional)
   *   trueSolar           when true, shift the clock to local apparent time
   */
  function computeChart(opts) {
    var tz = typeof opts.tz === 'number' ? opts.tz : 8;
    var hour = opts.hour || 0;
    var minute = opts.minute || 0;

    /* The physical instant never moves; only the clock we read it on. */
    var jdUT = julianDay(opts.year, opts.month, opts.day, hour + minute / 60 - tz);
    var jdTT = jdUT + deltaT(opts.year) / 86400;

    /* True solar time = clock time + longitude offset + equation of time. */
    var lonCorrection = 0, eot = 0;
    if (opts.trueSolar && typeof opts.longitude === 'number') {
      lonCorrection = (opts.longitude - tz * 15) * 4;
      eot = equationOfTime(jdTT);
    }
    var shiftMinutes = lonCorrection + eot;

    /* Apply the shift to the clock reading, rolling the date if it crosses
       midnight. Done in JD space so month lengths look after themselves. */
    var localJD = julianDay(opts.year, opts.month, opts.day,
      hour + minute / 60 + shiftMinutes / 60);
    var local = fromJulianDay(localJD + 0.5 / 86400);   /* nudge off rounding */

    /* --- month: which 節 interval holds this instant --- */
    var ty = local.year, tm = local.month;
    if (jdUT < termJD(ty, tm)) {
      tm -= 1;
      if (tm === 0) { tm = 12; ty -= 1; }
    }
    var termSpec = MONTH_TERM[tm];
    var monthBranch = termSpec.branch;
    var monthOrder = mod(tm - 2, 12);        /* 0 = 寅月 */

    /* --- year: 丑月 in January still belongs to the year before 立春 --- */
    var solarYear = tm === 1 ? ty - 1 : ty;
    var yearStem = mod(solarYear - 4, 10);
    var yearBranch = mod(solarYear - 4, 12);

    /* --- month stem: 五虎遁, 甲己之年丙作首 --- */
    var monthStem = mod((yearStem % 5) * 2 + 2 + monthOrder, 10);

    /* --- day: continuous 60-cycle; 子時 from 23:00 opens the next day --- */
    var jdn = Math.floor(julianDay(local.year, local.month, local.day, 12) + 0.5);
    if (local.hour >= 23) jdn += 1;
    var dayIndex = mod(jdn + 49, 60);
    var dayStem = dayIndex % 10;
    var dayBranch = dayIndex % 12;

    /* --- hour: 子 spans 23:00–00:59, then two hours each; 五鼠遁 for the stem --- */
    var hourBranch = Math.floor(mod(local.hour + 1, 24) / 2);
    var hourStem = mod((dayStem % 5) * 2 + hourBranch, 10);

    var pillars = {
      year: pillar(yearStem, yearBranch),
      month: pillar(monthStem, monthBranch),
      day: pillar(dayStem, dayBranch),
      hour: pillar(hourStem, hourBranch)
    };

    /* How close this birth sits to the month boundary either side of it. The
       sun model is good to a few minutes, so a birth inside an hour of a 節
       deserves a second opinion from a proper ephemeris before anyone leans
       on the month pillar. */
    var openJD = termJD(ty, tm);
    var nextY = ty, nextM = tm + 1;
    if (nextM === 13) { nextM = 1; nextY += 1; }
    var closeJD = termJD(nextY, nextM);
    var hoursSinceOpen = (jdUT - openJD) * 24;
    var hoursToClose = (closeJD - jdUT) * 24;
    var nearest = Math.min(hoursSinceOpen, hoursToClose);

    return {
      pillars: pillars,
      list: [pillars.year, pillars.month, pillars.day, pillars.hour],
      dayMaster: dayStem,
      dayMasterChar: STEMS[dayStem],
      dayMasterElement: STEM_ELEMENT[dayStem],
      dayMasterYang: dayStem % 2 === 0,
      season: SEASON[monthBranch],
      seasonEn: SEASON_EN[monthBranch],
      term: {
        name: termSpec.name,
        jd: openJD,
        at: fromJulianDay(openJD + tz / 24),
        next: MONTH_TERM[nextM].name,
        nextAt: fromJulianDay(closeJD + tz / 24),
        hoursSinceOpen: hoursSinceOpen,
        hoursToClose: hoursToClose,
        nearBoundary: nearest < 1,
        boundarySide: hoursSinceOpen < hoursToClose ? 'open' : 'close'
      },
      solarYear: solarYear,
      trueSolarShift: shiftMinutes,
      equationOfTime: eot,
      localClock: local,
      jdUT: jdUT
    };
  }

  /* ------------------------------------------------------------------ *
   * Weighing the chart
   * ------------------------------------------------------------------ */

  function tenGod(dayStem, otherStem) {
    var de = STEM_ELEMENT[dayStem], oe = STEM_ELEMENT[otherStem];
    var same = (dayStem % 2) === (otherStem % 2) ? 0 : 1;
    if (oe === de) return TEN_GODS.same[same];
    if (oe === (de + 1) % 5) return TEN_GODS.output[same];
    if (oe === (de + 2) % 5) return TEN_GODS.wealth[same];
    if (de === (oe + 2) % 5) return TEN_GODS.officer[same];
    return TEN_GODS.resource[same];
  }

  /* How the month's element treats an element: 旺相休囚死. */
  function seasonalState(element, monthElement) {
    if (element === monthElement) return { name: '旺', factor: 1.35 };
    if (element === (monthElement + 4) % 5) return { name: '相', factor: 1.15 };
    if (element === (monthElement + 1) % 5) return { name: '休', factor: 0.85 };
    if (element === (monthElement + 3) % 5) return { name: '囚', factor: 0.70 };
    return { name: '死', factor: 0.60 };
  }

  function analyse(chart) {
    var dm = chart.dayMaster;
    var dme = chart.dayMasterElement;
    var monthElement = BRANCH_ELEMENT[chart.pillars.month.branch];

    /* Raw weight per element: every visible stem counts 1, every branch
       spreads 1.2 across the stems hidden in it. */
    var raw = [0, 0, 0, 0, 0];
    var gods = {};
    var addGod = function (stem, weight) {
      var g = tenGod(dm, stem);
      gods[g] = (gods[g] || 0) + weight;
    };

    chart.list.forEach(function (p, i) {
      var stemWeight = i === 1 ? 1.2 : 1.0;   /* the month stem sits on the 令 */
      raw[STEM_ELEMENT[p.stem]] += stemWeight;
      addGod(p.stem, stemWeight);
      HIDDEN[p.branch].forEach(function (h) {
        var w = h[1] * (i === 1 ? 1.3 : 1.0);
        raw[STEM_ELEMENT[h[0]]] += w;
        addGod(h[0], w);
      });
    });

    /* Season-adjusted weight: the same characters mean more in their season. */
    var seasoned = raw.map(function (v, e) {
      return v * seasonalState(e, monthElement).factor;
    });
    var total = seasoned.reduce(function (a, b) { return a + b; }, 0);
    var share = seasoned.map(function (v) { return v / total; });

    /* Day-master strength: what supports it (same element + what generates it)
       against what drains, spends or controls it. */
    var ally = seasoned[dme] + seasoned[(dme + 4) % 5];
    var strengthRatio = ally / total;
    var onDuty = monthElement === dme || monthElement === (dme + 4) % 5;

    var strength, strengthEn;
    if (strengthRatio < 0.26) { strength = '极弱'; strengthEn = 'very weak'; }
    else if (strengthRatio < 0.40) { strength = '偏弱'; strengthEn = 'weak'; }
    else if (strengthRatio < 0.56) { strength = '中和'; strengthEn = 'balanced'; }
    else if (strengthRatio < 0.70) { strength = '偏旺'; strengthEn = 'strong'; }
    else { strength = '极旺'; strengthEn = 'very strong'; }
    var isStrong = strengthRatio >= 0.50;

    /* 用神, kept deliberately coarse: a strong day master wants an outlet, a
       weak one wants feeding. Among the candidates, take the scarcest. */
    var candidates = isStrong
      ? [(dme + 1) % 5, (dme + 2) % 5, (dme + 3) % 5]   /* 泄 / 耗 / 克 */
      : [(dme + 4) % 5, dme];                            /* 印 / 比劫 */
    var favoured = candidates.slice().sort(function (a, b) {
      return seasoned[a] - seasoned[b];
    })[0];

    /* 调候: winter charts want warmth, summer charts want water, whatever the
       strength arithmetic says. This is the one that governs the light. */
    var climate = null;
    if (monthElement === 4 || chart.season === '冬') {
      climate = { need: 1, note: '冬生调候喜火', en: 'a winter chart asks for warmth' };
    } else if (chart.season === '夏' && monthElement === 1) {
      climate = { need: 4, note: '夏生调候喜水', en: 'a summer chart asks for water' };
    } else if (monthElement === 2) {
      climate = { need: 0, note: '土重调候喜木疏', en: 'heavy earth asks for wood to open it' };
    }

    /* Scarcest and most abundant elements drive the palette. */
    var order = [0, 1, 2, 3, 4].sort(function (a, b) { return seasoned[b] - seasoned[a]; });
    var missing = [0, 1, 2, 3, 4].filter(function (e) { return raw[e] < 0.35; });

    /* Branch relationships — the drama in the composition. */
    var branches = chart.list.map(function (p) { return p.branch; });
    var relations = { clash: [], harmony: [], triad: [], stemHarmony: [] };
    var pushUnique = function (arr, v) { if (arr.indexOf(v) < 0) arr.push(v); };
    for (var i = 0; i < 4; i++) {
      for (var j = i + 1; j < 4; j++) {
        /* Name a pair by its lower branch first, so 子午 and 午子 are one thing. */
        var lo = Math.min(branches[i], branches[j]);
        var hi = Math.max(branches[i], branches[j]);
        if (mod(hi - lo, 12) === 6) {
          pushUnique(relations.clash, BRANCHES[lo] + BRANCHES[hi] + '冲');
        }
        SIX_HARMONY.forEach(function (pair) {
          if (pair.indexOf(lo) >= 0 && pair.indexOf(hi) >= 0 && lo !== hi) {
            pushUnique(relations.harmony, BRANCHES[lo] + BRANCHES[hi] + '合');
          }
        });
      }
    }
    TRIADS.forEach(function (t) {
      var hit = t.members.filter(function (b) { return branches.indexOf(b) >= 0; });
      if (hit.length === 3) {
        relations.triad.push({ name: t.name + '三合' + ELEMENTS[t.element] + '局', element: t.element, full: true });
      } else if (hit.length === 2 && (hit.indexOf(t.members[1]) >= 0)) {
        relations.triad.push({
          name: hit.map(function (b) { return BRANCHES[b]; }).join('') + '半合' + ELEMENTS[t.element],
          element: t.element, full: false
        });
      }
    });
    var stems = chart.list.map(function (p) { return p.stem; });
    STEM_HARMONY.forEach(function (h) {
      if (stems.indexOf(h.members[0]) >= 0 && stems.indexOf(h.members[1]) >= 0) {
        relations.stemHarmony.push(h.name);
      }
    });

    /* The loudest of the ten gods, which decides who else is in the picture. */
    var godPairs = Object.keys(gods).map(function (k) { return [k, gods[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });

    return {
      raw: raw,
      seasoned: seasoned,
      share: share,
      total: total,
      dominant: order[0],
      secondary: order[1],
      weakest: order[4],
      order: order,
      missing: missing,
      strength: strength,
      strengthEn: strengthEn,
      strengthRatio: strengthRatio,
      isStrong: isStrong,
      onDuty: onDuty,
      monthElement: monthElement,
      seasonalStates: [0, 1, 2, 3, 4].map(function (e) {
        return seasonalState(e, monthElement).name;
      }),
      favoured: favoured,
      climate: climate,
      relations: relations,
      gods: gods,
      godRanking: godPairs,
      tenGods: chart.list.map(function (p, i) {
        return i === 2 ? '日主' : tenGod(dm, p.stem);
      })
    };
  }

  return {
    STEMS: STEMS,
    BRANCHES: BRANCHES,
    STEM_PINYIN: STEM_PINYIN,
    BRANCH_PINYIN: BRANCH_PINYIN,
    ELEMENTS: ELEMENTS,
    ELEMENT_EN: ELEMENT_EN,
    STEM_ELEMENT: STEM_ELEMENT,
    BRANCH_ELEMENT: BRANCH_ELEMENT,
    HIDDEN: HIDDEN,
    computeChart: computeChart,
    analyse: analyse,
    tenGod: tenGod,
    termJD: termJD,
    sunLongitude: sunLongitude,
    equationOfTime: equationOfTime,
    julianDay: julianDay,
    fromJulianDay: fromJulianDay,
    deltaT: deltaT
  };
});
