/*
 * bazi-art.js — turn a weighed chart into a landscape.
 *
 * Two outputs from one reading:
 *   buildReading()  the imagery decisions, each traceable to a character
 *   buildPrompts()  those decisions written out for an image model
 *   paint()         a seeded ink draft on canvas, so the page shows a picture
 *                   even with no model behind it
 *
 * The mapping is a deliberate convention, not a claim about anyone's life:
 * the eight characters are read as a palette — element proportions become
 * colour and motif, day-master strength becomes scale, 調候 becomes light.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BaziArt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ELEMENTS = ['木', '火', '土', '金', '水'];
  var ELEMENT_EN = ['wood', 'fire', 'earth', 'metal', 'water'];

  /* ------------------------------------------------------------------ *
   * Vocabulary
   * ------------------------------------------------------------------ */

  /* The day-master stem is the protagonist: what the painting is *of*. */
  var PROTAGONIST = [
    { zh: '一株参天古松，独立主峰之侧，枝干如铁', en: 'a towering ancient pine standing alone beside the main peak, its trunk like wrought iron' },
    { zh: '崖畔的藤蔓与垂柳，柔而不断，随风倾侧', en: 'vines and a leaning willow on the cliff edge, supple, bending with the wind' },
    { zh: '一轮日轮自云背透出，光而不烈', en: 'the sun\'s disc pressing through cloud, luminous rather than fierce' },
    { zh: '茅屋窗内一点灯火，是全幅唯一的暖处', en: 'a single lamp in a hut window, the only warm point in the whole scene' },
    { zh: '一座浑厚主山，如墙壁般矗立正中', en: 'one massive central mountain standing like a wall' },
    { zh: '缓坡上的田垄与一条软土小径', en: 'terraced fields on a gentle slope and one soft earth path' },
    { zh: '斧劈而成的裸岩，铁灰色，棱角未磨', en: 'raw cleaved rock, iron-grey, its edges unworn' },
    { zh: '石上薄霜与一泓清潭，细处极亮', en: 'thin frost on stone and a clear pool, brilliant in the small details' },
    { zh: '一条大江自画外来，又向画外去', en: 'a great river entering from beyond the frame and leaving the same way' },
    { zh: '细雨与露气，山形都在湿意里柔化', en: 'fine rain and dew, every contour softened by moisture' }
  ];

  /* Each element's landscape vocabulary, drawn on when it is loud or absent. */
  var ELEMENT_SCENE = [
    {
      motif: ['松林', '修竹', '老藤', '苔径', '新柳'],
      en: ['pine forest', 'stands of bamboo', 'old vines', 'moss-covered paths', 'new willow'],
      when: ['any', 'any', 'any', 'any', 'any'],
      cun: '披麻皴，长而软的线条顺山势下垂',
      cunEn: 'hemp-fibre texture strokes, long and soft, following the slope',
      colour: '花青入墨，略施藤黄，浅绛薄染',
      colourEn: 'indigo worked into the ink, a touch of gamboge, thin ochre glaze',
      master: '王蒙', masterEn: 'Wang Meng'
    },
    {
      motif: ['丹枫', '晚霞', '渔火', '朱砂点苔', '暖阳'],
      en: ['crimson maples', 'evening cloud', 'fishing fires', 'vermilion moss dots', 'warm sun'],
      /* Fire's vocabulary is the one that argues with the clock: no fishing
         fires at ten in the morning, no warm sun at midnight. */
      when: ['any', 'evening', 'night', 'any', 'day'],
      cun: '米点皴与焦墨点苔，密处成团',
      cunEn: 'Mi-style dotting and burnt-ink moss dots, clustering where the ink is densest',
      colour: '朱砂、赭石点染，暖调压住墨气',
      colourEn: 'cinnabar and ochre accents warming the ink',
      master: '米友仁', masterEn: 'Mi Youren'
    },
    {
      motif: ['土坡', '台地', '赭壁', '田垄', '村舍'],
      en: ['earthen slopes', 'flat terraces', 'ochre cliffs', 'field ridges', 'a small hamlet'],
      when: ['any', 'any', 'any', 'any', 'any'],
      cun: '折带皴，横向转折，层层叠出台地',
      cunEn: 'folded-belt texture strokes, turning horizontally, stacking the terraces',
      colour: '赭石为主，土黄薄罩，墨色偏温',
      colourEn: 'ochre-dominant, a thin yellow-earth wash, the ink kept warm',
      master: '黄公望', masterEn: 'Huang Gongwang'
    },
    {
      motif: ['峭壁', '白石', '寒霜', '钟磬之声', '疏秋林'],
      en: ['sheer cliffs', 'white stone', 'frost', 'a distant temple bell', 'thinned autumn woods'],
      when: ['any', 'any', 'any', 'any', 'any'],
      cun: '斧劈皴，短促方硬，切面见骨',
      cunEn: 'axe-cut texture strokes, short and hard, every facet showing bone',
      colour: '几乎纯墨，冷灰，白处即白，不设色',
      colourEn: 'almost pure ink, cold grey, whites left as bare paper',
      master: '马远', masterEn: 'Ma Yuan'
    },
    {
      motif: ['江河', '飞瀑', '烟波', '云海', '积雪'],
      en: ['rivers', 'a falling cataract', 'misted water', 'a sea of cloud', 'lying snow'],
      when: ['any', 'any', 'any', 'any', 'any'],
      cun: '卷云皴，圆转回旋，山如云动',
      cunEn: 'rolling-cloud texture strokes, turning and circling, the mountains moving like vapour',
      colour: '淡墨为主，大量留白，花青轻掠水面',
      colourEn: 'pale ink, much bare paper, a light indigo drawn across the water',
      master: '董源', masterEn: 'Dong Yuan'
    }
  ];

  var SEASON_SCENE = {
    '春': { zh: '早春，寒气未尽而草木已动，烟雨欲来', en: 'early spring, the cold not yet gone but the trees stirring, rain coming' },
    '夏': { zh: '盛夏，浓荫蔽日，云头压山，欲雨未雨', en: 'high summer, dense shade, cloud heads pressing the peaks, rain withheld' },
    '秋': { zh: '深秋，林木疏落，天高气冷，远山透明', en: 'deep autumn, thinned woods, high cold air, the far mountains transparent' },
    '冬': { zh: '严冬，积雪压枝，水瘦石出，万籁俱寂', en: 'deep winter, snow weighting the branches, water low and stones exposed, everything silent' }
  };

  /* Hour branch → the light. Index matches 子丑寅卯…亥. */
  var HOUR_LIGHT = [
    { name: '子时', zh: '午夜，月在中天，墨色最重，唯水面发白', en: 'midnight, the moon at its height, the ink at its deepest, only the water pale', sky: 'night', sun: 'moon', height: 0.14 },
    { name: '丑时', zh: '夜将阑，霜气最重，山形只剩轮廓', en: 'the last of the night, frost at its heaviest, the mountains reduced to outline', sky: 'night', sun: 'moon', height: 0.24 },
    { name: '寅时', zh: '破晓之前，天地未分，一切在灰里', en: 'before daybreak, sky and earth not yet parted, everything held in grey', sky: 'predawn', sun: null, height: 0 },
    { name: '卯时', zh: '日出，宿雾初开，霞光贴着山脊走', en: 'sunrise, the night mist opening, light running along the ridgelines', sky: 'dawn', sun: 'sun', height: 0.62 },
    { name: '辰时', zh: '朝晖，晨雾散尽，山色清明', en: 'morning light, the mist burned off, the mountains clear', sky: 'morning', sun: 'sun', height: 0.48 },
    { name: '巳时', zh: '上午，天光明澈，远近分明', en: 'late morning, the light clean, near and far distinctly separated', sky: 'morning', sun: 'sun', height: 0.34 },
    { name: '午时', zh: '正午，光最烈，影最短，山石发白', en: 'noon, the light hardest, the shadows shortest, the rock faces blanched', sky: 'noon', sun: 'sun', height: 0.18 },
    { name: '未时', zh: '午后，暑气蒸腾，远山发白如失焦', en: 'early afternoon, heat rising, the far mountains whitening out of focus', sky: 'noon', sun: 'sun', height: 0.26 },
    { name: '申时', zh: '斜阳，山影渐长，一侧受光一侧全暗', en: 'slanting sun, the shadows lengthening, one flank lit and the other wholly dark', sky: 'afternoon', sun: 'sun', height: 0.40 },
    { name: '酉时', zh: '日落，晚霞满天，江面反光刺眼', en: 'sunset, the sky full of evening cloud, the river throwing back a hard glare', sky: 'sunset', sun: 'sun', height: 0.60 },
    { name: '戌时', zh: '暮色，暝烟四合，灯火初上', en: 'dusk, smoke and haze closing in, the first lamps lit', sky: 'dusk', sun: null, height: 0 },
    { name: '亥时', zh: '入夜，月出东山，江上无声', en: 'nightfall, the moon rising over the eastern ridge, the river silent', sky: 'night', sun: 'moon', height: 0.50 }
  ];

  /* Ten gods → who and what else is in the picture. */
  var GOD_STAFFAGE = {
    '比肩': { zh: '群峰并立，形近而不相让', en: 'ranked peaks of similar height, none yielding to another', draw: 'peaks' },
    '劫财': { zh: '两峰争高，中夹一线深谷', en: 'two peaks contesting height with a narrow gorge between them', draw: 'peaks' },
    '食神': { zh: '一道细泉自林间流出，几只飞鸟斜过', en: 'a thin spring running out of the woods, a few birds crossing on the diagonal', draw: 'birds' },
    '伤官': { zh: '飞瀑破崖而下，水声压过一切', en: 'a cataract breaking over the cliff, its noise covering everything', draw: 'birds' },
    '正财': { zh: '山下有田畴、篱落与炊烟', en: 'fields, fences and cooking smoke below the mountain', draw: 'boat' },
    '偏财': { zh: '江上渔舟数点，远处有市桥', en: 'a scattering of fishing boats, a market bridge in the distance', draw: 'boat' },
    '正官': { zh: '半山一座石塔，栈道沿崖而设，规矩井然', en: 'a stone pagoda halfway up, a plank road pinned along the cliff, everything in order', draw: 'pagoda' },
    '七杀': { zh: '险崖当路，一线栈道悬于绝壁', en: 'a precipice across the path, a single plank road hung on sheer rock', draw: 'pagoda' },
    '正印': { zh: '云气自谷中生，茅屋掩于林下', en: 'cloud rising out of the valley, a thatched hut half-hidden under the trees', draw: 'hut' },
    '偏印': { zh: '孤庵隐于云深处，不见人迹', en: 'a solitary hermitage deep in the cloud, no trace of anyone', draw: 'hut' }
  };

  var STRENGTH_COMPOSITION = {
    '极弱': { zh: '高远为主，主体极小，留白占去大半，人在天地间几不可辨', en: 'the lofty-distance mode, the subject very small, more than half the surface left bare, the human presence barely findable', figure: 0.35, density: 0.35, whitespace: 0.62 },
    '偏弱': { zh: '平远为主，景物疏朗，留白多于笔墨', en: 'the level-distance mode, the scene sparse, more empty paper than ink', figure: 0.5, density: 0.5, whitespace: 0.52 },
    '中和': { zh: '三远兼备，主次分明，虚实相生', en: 'all three distances present, a clear hierarchy, solid and void feeding each other', figure: 0.7, density: 0.68, whitespace: 0.4 },
    '偏旺': { zh: '深远为主，主峰逼近观者，墨色沉厚', en: 'the deep-distance mode, the main peak crowding the viewer, the ink heavy', figure: 0.85, density: 0.84, whitespace: 0.28 },
    '极旺': { zh: '全景式满构图，主峰占据画面三分之二，几无喘息处', en: 'a full panoramic composition, the main peak taking two thirds of the surface, almost nowhere to rest', figure: 1.0, density: 1.0, whitespace: 0.18 }
  };

  var TIME_WORD = ['月夜', '夜霜', '晓色', '初日', '朝晖', '晴光', '晴午', '午后', '斜阳', '夕照', '暮烟', '夜色'];
  var MOTIF_WORD = [
    ['松岭', '翠微', '竹坞', '苍林'],
    ['丹霞', '枫崖', '渔火', '暖屿'],
    ['平坡', '黄壤', '田舍', '厚岭'],
    ['削壁', '霜崖', '寒石', '白岩'],
    ['烟江', '飞瀑', '云海', '寒潭']
  ];
  var TIME_WORD_EN = ['Moonlit Night', 'Night Frost', 'First Light', 'Rising Sun', 'Morning Glow',
    'Clear Light', 'High Noon', 'Afternoon', 'Slanting Sun', 'Evening Glow', 'Dusk Smoke', 'Nightfall'];
  var MOTIF_WORD_EN = [
    ['Pine Ridge', 'Kingfisher Slopes', 'Bamboo Hollow', 'Dark Woods'],
    ['Cinnabar Cloud', 'Maple Cliff', 'Fishing Fires', 'Warm Islet'],
    ['Level Slope', 'Yellow Earth', 'Field Houses', 'Thick Ridges'],
    ['Cleft Wall', 'Frost Cliff', 'Cold Stone', 'White Rock'],
    ['Misted River', 'Falling Water', 'Sea of Cloud', 'Cold Pool']
  ];

  var COUPLET_OPEN = [
    ['万壑松声落石床', '老藤缠石不知年', '翠微深处有人家', '新篁初长过东墙'],
    ['一片丹霞烧晚山', '渔火三星照夜滩', '霜叶烧红半岭秋', '孤灯犹守雪中窗'],
    ['黄壤层层抱远村', '平坡缓缓卧斜阳', '土墙半掩野人家', '田垄如书写故园'],
    ['峭壁如刀削暮云', '白石清泉洗铁心', '一声寒磬出空林', '霜风削瘦万重山'],
    ['大江东去入苍茫', '烟波深处不见舟', '一线飞泉落九天', '雨过溪声满石梁']
  ];
  var COUPLET_CLOSE = [
    ['且向林间借一枝', '春信先从草木知', '数点新绿破寒烟', '留得青山听雨声'],
    ['留取残阳照晚舟', '一点微明胜万灯', '待得天青云破处', '暖色终从冷处生'],
    ['归来还宿旧山房', '人间自有立足田', '此心安处是吾乡', '厚土能承万斛愁'],
    ['磨尽浮华见真骨', '秋气入骨始通明', '删繁就简一峰寒', '霜后方知铁石心'],
    ['问渠何处是归程', '照见浮生一叶轻', '水穷云起总关情', '静看潮生又潮平']
  ];

  /* ------------------------------------------------------------------ *
   * Seeded randomness — the same chart must always give the same picture
   * ------------------------------------------------------------------ */

  function hashString(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }

  /* ------------------------------------------------------------------ *
   * The reading
   * ------------------------------------------------------------------ */

  function buildReading(chart, a, variation) {
    var key = chart.list.map(function (p) { return p.text; }).join('') + '|' + (variation || 0);
    var rng = mulberry32(hashString(key));

    var dom = a.dominant;
    var sec = a.secondary;
    var weak = a.weakest;
    var scene = ELEMENT_SCENE[dom];
    var secScene = ELEMENT_SCENE[sec];
    var yearn = a.climate ? a.climate.need : a.favoured;

    var hourBranch = chart.pillars.hour.branch;
    var light = HOUR_LIGHT[hourBranch];
    var comp = STRENGTH_COMPOSITION[a.strength];

    /* The loudest of the ten gods that is not the day master itself. */
    var topGod = null;
    for (var i = 0; i < a.godRanking.length; i++) {
      if (GOD_STAFFAGE[a.godRanking[i][0]]) { topGod = a.godRanking[i][0]; break; }
    }
    var staffage = GOD_STAFFAGE[topGod] || GOD_STAFFAGE['正印'];

    /* Clashes and harmonies decide whether the air is still or moving. */
    var weather = { zh: '气息安静，无风', en: 'the air still, no wind', drama: 0 };
    if (a.relations.clash.length >= 2) {
      weather = { zh: '风起云乱，断崖夹急湍，树皆一侧倾倒', en: 'wind up and the cloud disordered, rapids between broken cliffs, every tree leaning one way', drama: 2 };
    } else if (a.relations.clash.length === 1) {
      weather = { zh: '一阵风过，云脚被撕开一道口子', en: 'a gust passing, tearing one opening in the base of the cloud', drama: 1 };
    } else if (a.relations.harmony.length || a.relations.stemHarmony.length) {
      weather = { zh: '两峰相拥，溪流交汇于谷口，一桥连之', en: 'two peaks leaning together, streams meeting at the valley mouth, one bridge across', drama: 0 };
    }

    var floods = null;
    a.relations.triad.forEach(function (t) {
      if (t.full) floods = t;
    });

    /* One draw for both languages, or the scroll is called Dark Woods in
       Chinese and Bamboo Hollow in English. */
    var motifIdx = Math.floor(rng() * MOTIF_WORD[dom].length) % MOTIF_WORD[dom].length;
    var title = TIME_WORD[hourBranch] + MOTIF_WORD[dom][motifIdx] + '图';
    var titleEn = MOTIF_WORD_EN[dom][motifIdx] + ', ' + TIME_WORD_EN[hourBranch];
    var poem = [pick(rng, COUPLET_OPEN[dom]), pick(rng, COUPLET_CLOSE[yearn])];

    /* Motifs have to agree with the clock, or the prompt asks for fishing
       fires at ten in the morning and the model paints the contradiction. */
    var daylight = ['dawn', 'morning', 'noon', 'afternoon'].indexOf(light.sky) >= 0;
    var evening = ['sunset', 'dusk'].indexOf(light.sky) >= 0;
    var nightly = ['night', 'predawn'].indexOf(light.sky) >= 0;
    var allowed = function (when) {
      if (!when || when === 'any') return true;
      if (when === 'day') return daylight;
      if (when === 'evening') return evening || nightly;
      if (when === 'night') return nightly || evening;
      return true;
    };

    var motifs = [];
    var motifsEn = [];
    var n = 2 + Math.round(comp.density * 2);
    var idx = Math.floor(rng() * scene.motif.length);
    for (var k = 0; motifs.length < n && k < 12; k++) {
      var src = motifs.length < n - 1 ? scene : secScene;
      var srcIdx = (idx + k) % src.motif.length;
      if (!allowed(src.when && src.when[srcIdx])) continue;
      if (motifs.indexOf(src.motif[srcIdx]) < 0) {
        motifs.push(src.motif[srcIdx]);
        motifsEn.push(src.en[srcIdx]);
      }
    }

    return {
      seedKey: key,
      rngSeed: hashString(key),
      dominant: dom,
      secondary: sec,
      weakest: weak,
      yearn: yearn,
      scene: scene,
      secScene: secScene,
      protagonist: PROTAGONIST[chart.dayMaster],
      season: SEASON_SCENE[chart.season],
      light: light,
      composition: comp,
      topGod: topGod,
      staffage: staffage,
      weather: weather,
      floods: floods,
      motifs: motifs,
      motifsEn: motifsEn,
      title: title,
      titleEn: titleEn,
      poem: poem,
      /* Absence is a compositional instruction: leave the space it would fill. */
      absence: a.missing.length ? {
        elements: a.missing,
        zh: '八字中' + a.missing.map(function (e) { return ELEMENTS[e]; }).join('、') +
          '缺位，画中相应留白 —— 该有' +
          a.missing.map(function (e) { return ELEMENT_SCENE[e].motif[0]; }).join('、') +
          '的地方，什么也不画',
        en: 'the chart has no ' + a.missing.map(function (e) { return ELEMENT_EN[e]; }).join(' and no ') +
          ', so that region of the picture stays empty — where ' +
          a.missing.map(function (e) { return ELEMENT_SCENE[e].en[0]; }).join(' and ') +
          ' would belong, nothing is painted'
      } : null,
      warmth: a.climate ? (a.climate.need === 1 ? 'warm' : a.climate.need === 4 ? 'cool' : 'neutral') : 'neutral'
    };
  }

  /* ------------------------------------------------------------------ *
   * Prompts
   * ------------------------------------------------------------------ */

  function buildPrompts(chart, a, R) {
    var pillarText = chart.list.map(function (p) { return p.text; }).join(' ');

    var zh = [
      '中国传统水墨山水画，立轴，绢本设色。',
      '【主体】' + R.protagonist.zh + '。',
      '【时节】' + R.season.zh + '；' + R.light.zh + '。',
      '【景物】' + R.motifs.join('、') + '；' + R.staffage.zh + '。',
      '【气象】' + R.weather.zh + '。',
      '【构图】' + R.composition.zh + '。',
      '【笔法】' + R.scene.cun + '，兼取' + R.secScene.cun.split('，')[0] + '；墨分五色，浓淡干湿分明。',
      '【设色】' + R.scene.colour + '。',
      (R.absence ? '【留白】' + R.absence.zh + '。' : '【留白】虚处不是空白，是云、是水、是未尽之气。'),
      '【气质】' + R.scene.master + '一路，宋人全景气象，笔意苍润，不甜不媚。',
      '宣纸质感，墨色透纸，无款无印（题款另加），画面中不出现文字。'
    ].join('\n');

    var en = [
      'Traditional Chinese ink-wash landscape (shan shui), hanging-scroll format, ink and light colour on silk.',
      'Subject: ' + R.protagonist.en + '.',
      'Season and light: ' + R.season.en + '; ' + R.light.en + '.',
      'Scene: ' + R.motifsEn.join(', ') + '; ' + R.staffage.en + '.',
      'Atmosphere: ' + R.weather.en + '.',
      'Composition: ' + R.composition.en + '.',
      'Brushwork: ' + R.scene.cunEn + ', with some ' + R.secScene.cunEn.split(',')[0] + '; the full range of ink tones, wet against dry.',
      'Colour: ' + R.scene.colourEn + '.',
      (R.absence ? 'Negative space: ' + R.absence.en + '.'
        : 'Negative space: the voids are cloud, water and unspent air, never blankness.'),
      'In the manner of ' + R.scene.masterEn + ' and the Song monumental landscape tradition; austere, unsweetened brushwork.',
      'Aged xuan paper texture, ink soaking the fibre, no text anywhere in the image.'
    ].join(' ');

    var negative = [
      'photorealistic, photograph, 3d render, CGI, oil painting, acrylic, western landscape painting',
      'anime, manga, cartoon, chibi, digital airbrush, gradient smoothness',
      'neon, oversaturated, garish colour, HDR, lens flare, bokeh',
      'text, letters, calligraphy, watermark, signature, logo, seal stamp',
      'close-up portrait, large human figures, crowds, modern buildings, power lines, cars',
      'symmetrical framing, centred horizon, cluttered composition, busy background'
    ].join(', ');

    var params = {
      midjourney: '--ar 3:4 --style raw --stylize 250 --v 7',
      sd: 'Steps 32, CFG 5.5, Sampler DPM++ 2M Karras, 896×1200, hires-fix 1.5×',
      note: '立轴用 3:4 或 2:5；手卷改用 --ar 3:1 并把「全景式」换成「长卷散点透视」'
    };

    /* A compact one-liner, for models with a short prompt box. */
    var oneLine = 'Chinese ink-wash shan shui, ' + R.protagonist.en + ', ' + R.light.en +
      ', ' + R.motifsEn.slice(0, 3).join(', ') + ', ' + R.composition.en +
      ', ' + R.scene.cunEn + ', ' + R.scene.colourEn + ', after ' + R.scene.masterEn +
      ', xuan paper, no text ' + params.midjourney;

    return {
      title: R.title,
      titleEn: R.titleEn,
      poem: R.poem,
      pillars: pillarText,
      zh: zh,
      en: en,
      oneLine: oneLine,
      negative: negative,
      params: params
    };
  }

  /* ------------------------------------------------------------------ *
   * The ink draft
   *
   * Three rules do most of the work here. Silhouettes are built by taking
   * the max of asymmetric power curves, never the sum, because summing
   * gaussians gives soft buns instead of mountains. Texture strokes hang
   * off the ridgeline that generated them, so the 皴 follows the form
   * instead of scattering. And the value range is pushed hard — near-black
   * in the foreground, almost nothing in the distance — since that
   * separation is what reads as depth on paper.
   * ------------------------------------------------------------------ */

  var PAPER_WARM = '#f3ecdd';
  var PAPER_COOL = '#edefeb';
  var INK = [24, 27, 31];
  var ACCENT = ['#4a7350', '#b1462c', '#a8783c', '#67757f', '#3d5c78'];

  function ink(alpha) { return 'rgba(' + INK[0] + ',' + INK[1] + ',' + INK[2] + ',' + alpha + ')'; }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /*
   * Multi-octave value noise, normalised to roughly [-1, 1]. Midpoint
   * displacement was the first thing tried here and it fails for skylines:
   * its energy sits almost entirely in the first two subdivisions, so the
   * whole peak slides sideways instead of growing a broken edge. Explicit
   * octaves put controllable detail at every scale.
   */
  function octaveNoise(samples, octaves, persistence, rng, baseFreq) {
    var out = new Array(samples).fill(0);
    var amp = 1, total = 0;
    var f0 = baseFreq || 3;
    for (var o = 0; o < octaves; o++) {
      var pts = Math.round(f0 * (1 << o));
      var g = [];
      for (var i = 0; i <= pts; i++) g.push(rng() * 2 - 1);
      for (var s = 0; s < samples; s++) {
        var x = (s / (samples - 1)) * pts;
        var i0 = Math.min(pts - 1, Math.floor(x));
        var f = x - i0;
        var sm = f * f * (3 - 2 * f);
        out[s] += amp * (g[i0] * (1 - sm) + g[i0 + 1] * sm);
      }
      total += amp;
      amp *= persistence;
    }
    for (var k = 0; k < samples; k++) out[k] /= total;
    return out;
  }

  /* One peak: a power curve with a steep flank and a lazy one. */
  function peakAt(t, p) {
    var d = t - p.x;
    var w = d < 0 ? p.wl : p.wr;
    var u = Math.abs(d) / w;
    if (u >= 1) return 0;
    return p.h * Math.pow(1 - u, p.k);
  }

  /*
   * A ridge profile in pixels above its base line. Peaks combine by max, so
   * a near peak occludes a far one instead of adding to it; the fractal line
   * roughens in proportion to local height, and a couple of samples are
   * dropped outright to read as cliff faces.
   */
  function profile(samples, peaks, opts, rng) {
    var rough = opts.rough === undefined ? 0.62 : opts.rough;
    var jitter = opts.jitter === undefined ? 0.20 : opts.jitter;
    /*
     * Three explicit bands rather than one fBm. A single noise field always
     * ends up dominated by whichever end of the spectrum carries the weight:
     * too low and the peak merely leans, too high and the edge fuzzes
     * without ever breaking. Mountains read as mountains at the middle
     * band — features of roughly a tenth of the frame — so that one is
     * given its own amplitude.
     */
    var bend = octaveNoise(samples, 3, 0.55, rng, 2);    /* flank lean */
    var broke = octaveNoise(samples, 4, rough, rng, 7);  /* the real relief */
    var grain = octaveNoise(samples, 3, 0.60, rng, 44);  /* edge crumble */
    var out = new Array(samples);
    var i, t, h, p;

    for (i = 0; i < samples; i++) {
      t = i / (samples - 1);
      h = 0;
      for (p = 0; p < peaks.length; p++) {
        h = Math.max(h, peakAt(t, peaks[p]));
      }
      out[i] = h * (1 + bend[i] * jitter * 0.8 + broke[i] * jitter * 1.25) +
        grain[i] * Math.min(h, 70) * 0.16;
      if (out[i] < 0) out[i] = 0;
    }

    /* Cliffs: force a sudden drop over two samples on a steep flank. */
    var cliffs = opts.cliffs || 0;
    for (var c = 0; c < cliffs; c++) {
      var at = Math.floor(samples * (0.12 + rng() * 0.76));
      var drop = out[at] * (0.16 + rng() * 0.3);
      for (var j = at; j < Math.min(samples, at + 2 + Math.floor(rng() * 3)); j++) {
        out[j] = Math.max(0, out[j] - drop);
      }
    }
    return out;
  }

  function profileAt(prof, t) {
    var n = prof.length;
    var x = Math.max(0, Math.min(1, t)) * (n - 1);
    var i = Math.floor(x);
    var f = x - i;
    return i + 1 < n ? prof[i] * (1 - f) + prof[i + 1] * f : prof[i];
  }

  /* `bottomY` matters: filling every ridge down to the canvas edge stacks
     three transparent washes into one dead grey plate across the lower half.
     Each ridge stops just under its own base and fades out there. */
  function ridgePath(ctx, prof, baseY, W, bottomY) {
    var n = prof.length;
    ctx.beginPath();
    ctx.moveTo(0, baseY - prof[0]);
    for (var i = 1; i < n; i++) {
      ctx.lineTo((i / (n - 1)) * W, baseY - prof[i]);
    }
    ctx.lineTo(W, bottomY);
    ctx.lineTo(0, bottomY);
    ctx.closePath();
  }

  /* Irregular mist: overlapping soft ellipses, never a full-width band. */
  function mist(ctx, W, y, spread, strength, paperRgb, rng, blobs) {
    var n = blobs || 7;
    for (var i = 0; i < n; i++) {
      var cx = (i / n) * W + (rng() - 0.4) * (W / n) * 1.6;
      var cy = y + (rng() - 0.5) * spread * 0.7;
      var rx = W * (0.16 + rng() * 0.24);
      var ry = spread * (0.5 + rng() * 0.8);
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      var a = strength * (0.6 + rng() * 0.6);
      g.addColorStop(0, 'rgba(' + paperRgb.join(',') + ',' + a.toFixed(3) + ')');
      g.addColorStop(0.55, 'rgba(' + paperRgb.join(',') + ',' + (a * 0.55).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + paperRgb.join(',') + ',0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / Math.max(rx, ry));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /*
   * 皴. Every stroke starts from a point on the ridge and travels down the
   * slope beneath it, so the texture describes the mountain rather than
   * decorating it. `shade` biases density toward the flank in shadow.
   */
  function cun(ctx, style, prof, baseY, W, rng, opts) {
    var count = opts.count;
    var alpha = opts.alpha;
    var shade = opts.shade === undefined ? -1 : opts.shade;   /* -1 left, 1 right */
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (var i = 0; i < count; i++) {
      var t = rng();
      /* Bias toward the shaded flank. */
      if (shade < 0 ? rng() < 0.42 : rng() > 0.58) t = rng() * 0.5 + (shade < 0 ? 0 : 0.5);
      var ridgeH = profileAt(prof, t);
      if (ridgeH < 14) continue;

      var x = t * W;
      var depth = rng();
      var y = baseY - ridgeH * (1 - depth * depth * 0.92);   /* crowd near the top */
      var room = baseY - y;
      if (room < 8) continue;

      /* Local slope, used to point the stroke down-hill. */
      var dt = 1 / 220;
      var slope = (profileAt(prof, t + dt) - profileAt(prof, t - dt)) / (2 * dt * W);
      var lit = (slope * shade) > 0;
      var a = alpha * (lit ? 0.55 : 1) * (0.35 + rng() * 0.9) * (1 - depth * 0.45);
      ctx.strokeStyle = ink(a);
      ctx.fillStyle = ink(a);

      if (style === 3) {
        /* 斧劈: parallel slabs, all raked the same way down the face. */
        var len = Math.min(room * 0.5, 12 + rng() * 26);
        var ang = Math.atan(slope) + (rng() - 0.5) * 0.22;
        ctx.lineWidth = 1.6 + rng() * 3.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - Math.sin(ang) * len * 0.35 + (shade * len * 0.12),
          y + Math.cos(ang) * len);
        ctx.stroke();
      } else if (style === 1) {
        /* 米点: horizontal clusters lying along the contour. */
        var m = 4 + Math.floor(rng() * 6);
        for (var k = 0; k < m; k++) {
          var ox = (rng() - 0.5) * 26;
          ctx.beginPath();
          ctx.ellipse(x + ox, y + ox * slope * 0.5 + (rng() - 0.5) * 7,
            2.4 + rng() * 2.4, 1.5 + rng() * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (style === 2) {
        /* 折带: stacked horizontal shelves stepping down the slope. Drawn
           sparsely — repeated at density these turn into brickwork. */
        if (rng() < 0.55) continue;
        var shelf = 14 + rng() * 74;
        var steps = 1 + Math.floor(rng() * 3);
        ctx.lineWidth = 0.8 + rng() * 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        var sx = x, sy = y;
        for (var s = 0; s < steps; s++) {
          sx += shelf * (0.6 + rng() * 0.6) * (shade < 0 ? 1 : -1);
          ctx.lineTo(sx, sy + (rng() - 0.5) * 3);
          sy += Math.min(room / steps, 7 + rng() * 13);
          ctx.lineTo(sx + 3, sy);
        }
        ctx.stroke();
      } else if (style === 4) {
        /* 卷云: broad nested arcs. Small and numerous they read as
           scribble, so they are drawn large, sparse and all turning the
           same way down the slope. */
        if (rng() < 0.45) continue;
        ctx.lineWidth = 1 + rng() * 1.5;
        ctx.strokeStyle = ink(a * 0.7);
        var r0 = 22 + rng() * 40;
        var open = Math.atan(slope) + (shade < 0 ? 0.3 : -0.3);
        for (var q = 0; q < 2; q++) {
          ctx.beginPath();
          ctx.arc(x, y + q * 8, r0 - q * 9, open + 0.25, open + 2.5);
          ctx.stroke();
        }
      } else {
        /* 披麻: long fibres hanging from the ridge, following the fall line. */
        var h = Math.min(room * 0.9, 34 + rng() * 88);
        var bend = (rng() - 0.5) * 20 - slope * 16;
        ctx.lineWidth = 0.8 + rng() * 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + bend * 0.3, y + h * 0.35,
          x + bend, y + h * 0.72, x + bend * 0.6, y + h);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* A pale line along the lit edge of a ridge: the cheapest way to make a
     silhouette read as a solid body rather than a paper cut-out. */
  function litEdge(ctx, prof, baseY, W, paperRgb, alpha, side) {
    ctx.save();
    ctx.strokeStyle = 'rgba(' + paperRgb.join(',') + ',' + alpha + ')';
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    var n = prof.length;
    var started = false;
    for (var i = 1; i < n; i++) {
      var slope = prof[i] - prof[i - 1];
      var onLit = side > 0 ? slope < -0.4 : slope > 0.4;
      var x = (i / (n - 1)) * W;
      var y = baseY - prof[i] + 1.6;
      if (onLit && prof[i] > 20) {
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      } else {
        started = false;
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function mossDots(ctx, prof, baseY, W, rng, count, alpha) {
    for (var i = 0; i < count; i++) {
      var t = rng();
      var h = profileAt(prof, t);
      if (h < 16) continue;
      var x = t * W;
      var y = baseY - h + rng() * 9;
      ctx.fillStyle = ink(alpha * (0.5 + rng() * 0.7));
      var m = 1 + Math.floor(rng() * 3);
      for (var k = 0; k < m; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (rng() - 0.5) * 9, y + (rng() - 0.5) * 7,
          1.5 + rng() * 2.2, 1.1 + rng() * 1.5, rng(), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* --- staffage ------------------------------------------------------- */

  /*
   * 松针 are drawn as small radiating fans, several overlapping into one
   * tuft. Getting this wrong is what turns a pine into a telephone pole:
   * the limbs have to curve and lift at the tip, and the foliage has to be
   * a rounded mass rather than marks strung along a horizontal bar.
   */
  function needleFan(ctx, cx, cy, r, rng, alpha) {
    var spokes = 7 + Math.floor(rng() * 5);
    var centre = Math.PI * (0.15 + rng() * 0.7);   /* fans open downward-ish */
    var span = 1.1 + rng() * 0.7;
    ctx.lineWidth = Math.max(0.5, r * 0.075);
    for (var i = 0; i < spokes; i++) {
      var ang = centre - span / 2 + (i / (spokes - 1)) * span + (rng() - 0.5) * 0.12;
      var len = r * (0.7 + rng() * 0.5);
      ctx.strokeStyle = ink(alpha * (0.55 + rng() * 0.5));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      ctx.stroke();
    }
  }

  function needleTuft(ctx, cx, cy, r, rng, alpha) {
    var fans = 6 + Math.floor(rng() * 5);
    for (var i = 0; i < fans; i++) {
      var a = rng() * Math.PI * 2;
      var d = Math.sqrt(rng()) * r * 0.62;
      needleFan(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7,
        r * (0.42 + rng() * 0.3), rng, alpha);
    }
  }

  function pine(ctx, x, y, h, rng, alpha) {
    /* An S-curved trunk, drawn as a tapered body. */
    var sway = (rng() - 0.5) * h * 0.22;
    var topX = x + sway, topY = y - h;
    var midX = x + sway * (rng() < 0.5 ? -0.5 : 0.9);
    var bw = Math.max(2.4, h * 0.048);

    ctx.fillStyle = ink(alpha);
    ctx.beginPath();
    ctx.moveTo(x - bw, y);
    ctx.bezierCurveTo(midX - bw * 0.7, y - h * 0.42,
      topX - bw * 0.3, y - h * 0.78, topX - bw * 0.18, topY);
    ctx.lineTo(topX + bw * 0.18, topY);
    ctx.bezierCurveTo(topX + bw * 0.3, y - h * 0.78,
      midX + bw * 0.7, y - h * 0.42, x + bw, y);
    ctx.closePath();
    ctx.fill();

    /* 鳞皮: a few scale marks up the trunk */
    ctx.strokeStyle = ink(alpha * 0.5);
    ctx.lineWidth = Math.max(0.5, h * 0.006);
    for (var sc = 0; sc < 7; sc++) {
      var sf = 0.08 + rng() * 0.7;
      var sx3 = x + (midX - x) * sf * 1.4;
      var sy3 = y - h * sf;
      ctx.beginPath();
      ctx.arc(sx3, sy3, bw * 0.75, 0.4, 2.6);
      ctx.stroke();
    }

    /* Limbs: out, then lifting at the tip, each ending in a tuft. */
    var tiers = 3 + Math.floor(rng() * 3);
    for (var t = 0; t < tiers; t++) {
      var f = 0.34 + (t / Math.max(1, tiers - 1)) * 0.56;
      var trunkX = x + (midX - x) * f * 1.35;
      var by = y - h * f;
      var side = (t % 2 === 0 ? 1 : -1) * (rng() < 0.12 ? -1 : 1);
      var reach = h * (0.36 - t * 0.04) * (0.7 + rng() * 0.55);
      var tipX = trunkX + side * reach;
      var tipY = by - reach * (0.18 + rng() * 0.3);   /* lifting */

      ctx.strokeStyle = ink(alpha);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.1, h * 0.019 * (1 - t * 0.1));
      ctx.beginPath();
      ctx.moveTo(trunkX, by);
      ctx.bezierCurveTo(trunkX + side * reach * 0.4, by + reach * 0.14,
        trunkX + side * reach * 0.78, by - reach * 0.02, tipX, tipY);
      ctx.stroke();

      needleTuft(ctx, tipX, tipY - reach * 0.06, reach * (0.42 + rng() * 0.16),
        rng, alpha);
      if (rng() < 0.6) {
        needleTuft(ctx, trunkX + side * reach * 0.5, by - reach * 0.02,
          reach * 0.28, rng, alpha * 0.85);
      }
    }
    /* the crown */
    needleTuft(ctx, topX, topY + h * 0.02, h * 0.13, rng, alpha);
  }

  function leafTree(ctx, x, y, h, rng, alpha) {
    var lean = (rng() - 0.5) * h * 0.16;
    var bw = Math.max(1.8, h * 0.038);
    ctx.fillStyle = ink(alpha);
    ctx.beginPath();
    ctx.moveTo(x - bw, y);
    ctx.quadraticCurveTo(x + lean * 0.4 - bw * 0.3, y - h * 0.4,
      x + lean - bw * 0.2, y - h * 0.62);
    ctx.lineTo(x + lean + bw * 0.2, y - h * 0.62);
    ctx.quadraticCurveTo(x + lean * 0.4 + bw * 0.3, y - h * 0.4, x + bw, y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = ink(alpha * 0.9);
    ctx.lineCap = 'round';
    for (var b = 0; b < 4; b++) {
      var by = y - h * (0.34 + b * 0.09);
      var dir = b % 2 === 0 ? 1 : -1;
      ctx.lineWidth = Math.max(0.7, h * 0.014);
      ctx.beginPath();
      ctx.moveTo(x + lean * 0.5, by);
      ctx.quadraticCurveTo(x + dir * h * 0.16, by - h * 0.06,
        x + dir * h * 0.26, by - h * 0.14);
      ctx.stroke();
    }

    /* 胡椒点: the crown as a mass of dots, densest at the middle */
    var cx = x + lean, cy = y - h * 0.74;
    var rx = h * 0.34, ry = h * 0.24;
    for (var i = 0; i < 90; i++) {
      var ang = rng() * Math.PI * 2;
      var rad = Math.sqrt(rng());
      var px = cx + Math.cos(ang) * rx * rad;
      var py = cy + Math.sin(ang) * ry * rad;
      ctx.fillStyle = ink(alpha * (0.30 + (1 - rad) * 0.6) * (0.6 + rng() * 0.6));
      ctx.beginPath();
      ctx.ellipse(px, py, 1.5 + rng() * 2.3, 1.2 + rng() * 1.8, rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function bamboo(ctx, x, y, h, rng, alpha) {
    for (var s = 0; s < 3; s++) {
      var sx = x + (s - 1) * h * 0.10 + (rng() - 0.5) * h * 0.06;
      var sh = h * (0.72 + rng() * 0.4);
      var bend = h * (0.03 + rng() * 0.05);
      var culmW = Math.max(1.4, h * 0.015);

      ctx.strokeStyle = ink(alpha * 0.9);
      ctx.lineWidth = culmW;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.quadraticCurveTo(sx + bend * 0.5, y - sh * 0.6, sx + bend, y - sh);
      ctx.stroke();

      /* 节: the joints, without which a culm is just a line */
      var joints = 5 + Math.floor(rng() * 3);
      for (var j = 1; j <= joints; j++) {
        var jf = j / (joints + 1);
        var jx = sx + bend * jf * jf;
        var jy = y - sh * jf;
        ctx.lineWidth = culmW * 1.5;
        ctx.beginPath();
        ctx.moveTo(jx - culmW, jy);
        ctx.lineTo(jx + culmW, jy);
        ctx.stroke();
      }

      /* Leaves hang in threes off the upper joints, tapered and drooping. */
      var groups = 3 + Math.floor(rng() * 3);
      for (var g = 0; g < groups; g++) {
        var gf = 0.45 + rng() * 0.52;
        var gx = sx + bend * gf * gf;
        var gy = y - sh * gf;
        var dir = rng() < 0.5 ? 1 : -1;
        for (var l = 0; l < 3; l++) {
          var spread = (l - 1) * 0.42 + (rng() - 0.5) * 0.2;
          var len = h * (0.13 + rng() * 0.1);
          var tipX = gx + dir * len * Math.cos(spread * 0.9);
          var tipY = gy + len * (0.35 + Math.abs(spread) * 0.6);
          ctx.fillStyle = ink(alpha * (0.55 + rng() * 0.45));
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.quadraticCurveTo(gx + dir * len * 0.55, gy + len * 0.06,
            tipX, tipY);
          ctx.quadraticCurveTo(gx + dir * len * 0.45, gy + len * 0.24, gx, gy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  function hut(ctx, x, y, s, rng, alpha, lamp) {
    ctx.fillStyle = ink(alpha * 0.9);
    ctx.strokeStyle = ink(alpha);
    ctx.lineWidth = Math.max(1, s * 0.055);
    /* thatch: a sagging sweep with the eaves lifted */
    ctx.beginPath();
    ctx.moveTo(x - s * 1.15, y - s * 0.46);
    ctx.quadraticCurveTo(x - s * 0.5, y - s * 1.05, x, y - s * 1.12);
    ctx.quadraticCurveTo(x + s * 0.5, y - s * 1.05, x + s * 1.15, y - s * 0.46);
    ctx.quadraticCurveTo(x, y - s * 0.30, x - s * 1.15, y - s * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.68, y - s * 0.40); ctx.lineTo(x - s * 0.68, y);
    ctx.moveTo(x + s * 0.68, y - s * 0.40); ctx.lineTo(x + s * 0.68, y);
    ctx.moveTo(x - s * 0.74, y); ctx.lineTo(x + s * 0.74, y);
    ctx.stroke();
    if (lamp) {
      var g = ctx.createRadialGradient(x, y - s * 0.2, 0, x, y - s * 0.2, s * 1.1);
      g.addColorStop(0, 'rgba(226,148,66,0.72)');
      g.addColorStop(0.4, 'rgba(220,146,72,0.20)');
      g.addColorStop(1, 'rgba(220,146,72,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y - s * 0.2, s * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function boat(ctx, x, y, s, rng, alpha) {
    ctx.strokeStyle = ink(alpha);
    ctx.lineWidth = Math.max(1.2, s * 0.10);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.08);
    ctx.quadraticCurveTo(x, y + s * 0.34, x + s, y - s * 0.08);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.9, s * 0.075);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.12, y - s * 0.10);
    ctx.lineTo(x + s * 0.06, y - s * 0.52);
    ctx.moveTo(x - s * 0.40, y - s * 0.66);
    ctx.lineTo(x + s * 0.46, y - s * 0.16);
    ctx.stroke();
    ctx.fillStyle = ink(alpha);
    ctx.beginPath();
    ctx.arc(x + s * 0.05, y - s * 0.60, s * 0.10, 0, Math.PI * 2);
    ctx.fill();
    /* the wake, two ticks */
    ctx.strokeStyle = ink(alpha * 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - s * 2.1, y + s * 0.22); ctx.lineTo(x - s * 0.9, y + s * 0.16);
    ctx.moveTo(x + s * 1.0, y + s * 0.20); ctx.lineTo(x + s * 2.3, y + s * 0.26);
    ctx.stroke();
  }

  function pagoda(ctx, x, y, s, rng, alpha) {
    ctx.strokeStyle = ink(alpha);
    ctx.fillStyle = ink(alpha * 0.55);
    ctx.lineWidth = Math.max(0.9, s * 0.05);
    var tiers = 4;
    for (var i = 0; i < tiers; i++) {
      var f = 1 - i * 0.16;
      var ty = y - i * s * 0.56;
      ctx.beginPath();
      ctx.rect(x - s * 0.30 * f, ty - s * 0.52, s * 0.60 * f, s * 0.52);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - s * 0.62 * f, ty);
      ctx.quadraticCurveTo(x, ty - s * 0.30, x + s * 0.62 * f, ty);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x, y - tiers * s * 0.56);
    ctx.lineTo(x, y - tiers * s * 0.56 - s * 0.42);
    ctx.stroke();
  }

  function birds(ctx, x, y, n, s, rng, alpha) {
    ctx.strokeStyle = ink(alpha);
    ctx.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var bx = x + i * s * (1.9 + rng()) + (rng() - 0.5) * s;
      var by = y + i * s * 0.8 + (rng() - 0.5) * s * 1.8;
      var w = s * (0.7 + rng() * 0.6);
      ctx.lineWidth = Math.max(0.8, s * 0.12);
      ctx.beginPath();
      ctx.moveTo(bx - w, by);
      ctx.quadraticCurveTo(bx - w * 0.3, by - w * 0.46, bx, by - w * 0.04);
      ctx.quadraticCurveTo(bx + w * 0.3, by - w * 0.46, bx + w, by);
      ctx.stroke();
    }
  }

  /* --- the picture ------------------------------------------------------ */

  function paint(canvas, chart, a, R) {
    var W = 900, H = 1200;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.aspectRatio = '3 / 4';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var rng = mulberry32(R.rngSeed);
    var comp = R.composition;
    var dense = comp.density;
    var warm = R.warmth === 'warm';
    var paperHex = warm ? PAPER_WARM : PAPER_COOL;
    var paper = hexToRgb(paperHex);
    var paperCss = 'rgb(' + paper.join(',') + ')';
    var accent = hexToRgb(ACCENT[R.dominant]);
    var night = R.light.sky === 'night' || R.light.sky === 'predawn' || R.light.sky === 'dusk';
    /* Which side the light comes from decides every shadow in the picture. */
    var lightSide = rng() < 0.5 ? -1 : 1;

    /* --- paper -------------------------------------------------------- */
    ctx.fillStyle = paperHex;
    ctx.fillRect(0, 0, W, H);
    for (var f = 0; f < 3200; f++) {
      ctx.fillStyle = 'rgba(126,110,84,' + (rng() * 0.03).toFixed(3) + ')';
      ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 3, 1);
    }

    /* --- sky ---------------------------------------------------------- */
    var skyTop, skyMid;
    if (night) { skyTop = 'rgba(50,60,76,0.34)'; skyMid = 'rgba(50,60,76,0.03)'; }
    else if (R.light.sky === 'sunset' || R.light.sky === 'dawn') { skyTop = 'rgba(146,104,74,0.20)'; skyMid = 'rgba(196,132,78,0.07)'; }
    else { skyTop = 'rgba(86,102,118,0.15)'; skyMid = 'rgba(86,102,118,0.01)'; }
    var sg = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sg.addColorStop(0, skyTop);
    sg.addColorStop(1, skyMid);
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H * 0.55);

    /* --- sun or moon --------------------------------------------------- */
    var discX = 0, discY = 0, hasDisc = false;
    if (R.light.sun) {
      hasDisc = true;
      discX = W * (lightSide < 0 ? 0.20 + rng() * 0.16 : 0.64 + rng() * 0.16);
      discY = H * (0.28 - R.light.height * 0.20);
      /* A flat saturated disc reads as a flag, not as weather. Only the
         low sun of dawn and sunset earns colour; overhead it is barely
         more than a warm hole in the wash. */
      var lowSun = R.light.sky === 'sunset' || R.light.sky === 'dawn';
      var discR = R.light.sun === 'sun' ? (lowSun ? 42 : 34) : 32;
      var core = R.light.sun !== 'sun' ? 'rgba(214,220,230,'
        : lowSun ? 'rgba(178,78,48,' : 'rgba(196,150,116,';
      var halo = ctx.createRadialGradient(discX, discY, discR * 0.5, discX, discY, discR * 4);
      halo.addColorStop(0, core + (R.light.sun === 'sun' ? (lowSun ? 0.22 : 0.13) : 0.34) + ')');
      halo.addColorStop(1, core + '0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(discX, discY, discR * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = R.light.sun === 'sun'
        ? core + (lowSun ? 0.42 : 0.20) + ')'
        : paperCss;
      ctx.beginPath(); ctx.arc(discX, discY, discR, 0, Math.PI * 2); ctx.fill();
      if (R.light.sun === 'moon') {
        ctx.strokeStyle = ink(0.09);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(discX, discY, discR, 0, Math.PI * 2); ctx.stroke();
      }
      /* veil it, so the disc sits in the sky rather than on top of it */
      mist(ctx, W, discY + discR * 0.5, discR * 1.1, 0.45, paper, rng, 3);
    }

    /* --- far ridges ----------------------------------------------------- */
    var horizon = H * 0.44;
    for (var layer = 0; layer < 3; layer++) {
      var lp = profile(129, [
        { x: 0.10 + rng() * 0.25, h: 44 + rng() * 54, wl: 0.13 + rng() * 0.14, wr: 0.14 + rng() * 0.16, k: 1.15 + rng() * 0.4 },
        { x: 0.45 + rng() * 0.2, h: 34 + rng() * 66, wl: 0.14 + rng() * 0.14, wr: 0.12 + rng() * 0.14, k: 1.15 + rng() * 0.4 },
        { x: 0.72 + rng() * 0.24, h: 30 + rng() * 58, wl: 0.15 + rng() * 0.14, wr: 0.13 + rng() * 0.14, k: 1.15 + rng() * 0.4 }
      ], { rough: 0.6, jitter: 0.22, cliffs: 1 }, rng);
      var lBase = horizon - (2 - layer) * 30;
      ctx.save();
      ridgePath(ctx, lp, lBase, W, lBase + 52);
      var lg = ctx.createLinearGradient(0, lBase - 100, 0, lBase + 52);
      lg.addColorStop(0, ink(0.075 + layer * 0.05));
      lg.addColorStop(0.7, ink(0.04 + layer * 0.03));
      lg.addColorStop(1, ink(0));
      ctx.fillStyle = lg;
      ctx.fill();
      ctx.restore();
      mist(ctx, W, lBase + 4, 30, 0.85, paper, rng, 6);
    }

    /* --- the main mountain ---------------------------------------------- */
    var mainX = lightSide < 0 ? 0.52 + rng() * 0.16 : 0.30 + rng() * 0.16;
    var mainH = H * (0.30 + dense * 0.26);
    var mainBase = H * 0.66;
    /* A summit is never symmetrical: one flank falls away long and the
       other drops. A second head just off the apex keeps it from reading
       as a cone. */
    var steepSide = rng() < 0.5 ? -1 : 1;
    var peaks = [
      {
        x: mainX, h: mainH,
        wl: (steepSide < 0 ? 0.12 : 0.24) + dense * 0.05,
        wr: (steepSide < 0 ? 0.25 : 0.13) + dense * 0.05,
        k: 1.25 + rng() * 0.35
      },
      {
        x: mainX + steepSide * (0.05 + rng() * 0.05),
        h: mainH * (0.72 + rng() * 0.16),
        wl: 0.10 + rng() * 0.05, wr: 0.13 + rng() * 0.06, k: 1.5
      },
      { x: mainX - 0.27 - rng() * 0.08, h: mainH * (0.44 + rng() * 0.22), wl: 0.15, wr: 0.22, k: 1.15 + rng() * 0.3 },
      { x: mainX + 0.26 + rng() * 0.10, h: mainH * (0.38 + rng() * 0.28), wl: 0.21, wr: 0.14, k: 1.15 + rng() * 0.3 }
    ];
    if (R.topGod === '比肩' || R.topGod === '劫财') {
      peaks.push({ x: mainX + 0.13, h: mainH * (0.80 + rng() * 0.14), wl: 0.11, wr: 0.13, k: 1.45 });
    }
    var mp = profile(513, peaks, {
      rough: R.dominant === 3 ? 0.72 : 0.62,
      jitter: R.dominant === 3 ? 0.24 : 0.18,
      cliffs: R.dominant === 3 ? 5 : 3
    }, rng);

    ctx.save();
    ridgePath(ctx, mp, mainBase, W, mainBase + 34);
    ctx.clip();

    /* body wash: darker at the summit, dissolving into the mist at the base */
    var bodyG = ctx.createLinearGradient(0, mainBase - mainH, 0, mainBase + 34);
    bodyG.addColorStop(0, ink(0.34 + dense * 0.18));
    bodyG.addColorStop(0.60, ink(0.18 + dense * 0.13));
    bodyG.addColorStop(0.92, ink(0.05));
    bodyG.addColorStop(1, ink(0));
    ctx.fillStyle = bodyG;
    ctx.fillRect(0, 0, W, H);

    /* the shaded flank */
    var shadeG = ctx.createLinearGradient(lightSide < 0 ? W : 0, 0, lightSide < 0 ? 0 : W, 0);
    shadeG.addColorStop(0, ink(0.16));
    shadeG.addColorStop(0.55, ink(0.02));
    shadeG.addColorStop(1, ink(0));
    ctx.fillStyle = shadeG;
    ctx.fillRect(0, mainBase - mainH - 20, W, mainH + 20);

    cun(ctx, R.dominant, mp, mainBase, W, rng,
      { count: Math.round(200 + dense * 340),
        alpha: R.dominant === 2 ? 0.075 : 0.10, shade: -lightSide });
    cun(ctx, R.secondary, mp, mainBase, W, rng,
      { count: Math.round(60 + dense * 90), alpha: 0.055, shade: -lightSide });

    /* a cataract cut into the face when water runs strong */
    if (R.dominant === 4 || R.secondary === 4 || R.topGod === '伤官') {
      var fx = W * (mainX + (rng() < 0.5 ? -1 : 1) * (0.06 + rng() * 0.10));
      var fTop = mainBase - profileAt(mp, fx / W) * (0.72 + rng() * 0.12);
      var fw = 9 + rng() * 11;
      ctx.fillStyle = paperCss;
      ctx.beginPath();
      var yy;
      for (yy = fTop; yy < mainBase + 14; yy += 12) {
        ctx.lineTo(fx - fw / 2 + Math.sin(yy * 0.055) * 3.5 - (yy - fTop) * 0.02, yy);
      }
      for (yy = mainBase + 14; yy > fTop; yy -= 12) {
        ctx.lineTo(fx + fw / 2 + Math.sin(yy * 0.048) * 3.5 + (yy - fTop) * 0.02, yy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink(0.09);
      ctx.lineWidth = 1;
      for (var s2 = 0; s2 < 6; s2++) {
        var sx2 = fx - fw / 2 + rng() * fw;
        ctx.beginPath();
        ctx.moveTo(sx2, fTop + rng() * 26);
        ctx.lineTo(sx2 + (rng() - 0.5) * 5, mainBase - rng() * 50);
        ctx.stroke();
      }
      mist(ctx, W, mainBase - 4, 26, 0.9, paper, rng, 4);
    }
    ctx.restore();

    litEdge(ctx, mp, mainBase, W, paper, 0.30, lightSide);
    mossDots(ctx, mp, mainBase, W, rng, Math.round(50 + dense * 90), 0.34);

    if (R.staffage.draw === 'pagoda') {
      var pgT = mainX + lightSide * 0.17;
      pagoda(ctx, W * pgT, mainBase - profileAt(mp, pgT) * 0.34, 12, rng, 0.46);
    }

    /* --- mist separating mountain from water ------------------------------ */
    mist(ctx, W, mainBase - 26, 44 + comp.whitespace * 46, 0.95, paper, rng, 9);
    mist(ctx, W, mainBase + 6, 30, 0.8, paper, rng, 6);

    /* --- far shore: a low band that dissolves rather than ends ------------ */
    var waterY = H * 0.70;
    var shoreProf = profile(257, [
      { x: 0.14 + rng() * 0.16, h: 26 + rng() * 20, wl: 0.24, wr: 0.30, k: 1.1 },
      { x: 0.66 + rng() * 0.2, h: 22 + rng() * 26, wl: 0.28, wr: 0.24, k: 1.1 }
    ], { rough: 0.58, jitter: 0.30, cliffs: 1 }, rng);
    ctx.save();
    ridgePath(ctx, shoreProf, waterY, W, waterY + 6);
    ctx.clip();
    var shoreG = ctx.createLinearGradient(0, waterY - 60, 0, waterY);
    shoreG.addColorStop(0, ink(0.24));
    shoreG.addColorStop(1, ink(0.07));
    ctx.fillStyle = shoreG;
    ctx.fillRect(0, waterY - 80, W, 90);
    cun(ctx, R.dominant, shoreProf, waterY, W, rng, { count: 70, alpha: 0.07, shade: -lightSide });
    ctx.restore();
    mist(ctx, W, waterY - 4, 20, 0.75, paper, rng, 7);

    /* --- water: bare paper, a reflection, a few ticks ---------------------- */
    ctx.fillStyle = paperCss;
    ctx.fillRect(0, waterY + 2, W, H - waterY);

    /* the mountain's reflection, smeared and very faint */
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.translate(0, waterY * 2 + 6);
    ctx.scale(1, -0.42);
    ridgePath(ctx, mp, mainBase, W, mainBase + 34);
    ctx.fillStyle = ink(0.5);
    ctx.fill();
    ctx.restore();
    mist(ctx, W, waterY + 30, 34, 0.9, paper, rng, 7);

    ctx.strokeStyle = ink(0.11);
    ctx.lineWidth = 1;
    for (var r = 0; r < 22; r++) {
      var rt = r / 22;
      var ry = waterY + 16 + Math.pow(rt, 1.35) * (H - waterY - 40);
      var ticks = 1 + Math.floor(rng() * 4);
      for (var t2 = 0; t2 < ticks; t2++) {
        var tx = rng() * W;
        var tw = 24 + rng() * 110 * (0.4 + rt);
        ctx.globalAlpha = (0.2 + rng() * 0.45) * (0.45 + rt * 0.75);
        ctx.beginPath();
        ctx.moveTo(tx, ry);
        ctx.quadraticCurveTo(tx + tw / 2, ry - 1.5 - rng() * 2.5, tx + tw, ry);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    /* --- near bank: the darkest thing in the picture ----------------------- */
    var fgLeft = lightSide > 0;
    var bankTop = H * (0.80 - dense * 0.05);
    var bfrac = octaveNoise(97, 4, 0.55, rng, 3);
    var bgrain = octaveNoise(97, 3, 0.6, rng, 16);

    /* Boulders are built into the bank's own outline. Drawn as separate
       shapes on top they read as paving stones; biting into the silhouette
       they read as rock the bank is made of. */
    var boulders = [];
    for (var bo = 0; bo < 3 + Math.floor(rng() * 3); bo++) {
      boulders.push({ t: 0.08 + rng() * 0.78, w: 0.06 + rng() * 0.09, h: 16 + rng() * 34 });
    }
    var bankEdge = function (t) {
      var i = Math.round(t * 96);
      var lift = 0;
      for (var b = 0; b < boulders.length; b++) {
        var d = (t - boulders[b].t) / boulders[b].w;
        if (Math.abs(d) < 1) lift += boulders[b].h * Math.pow(1 - Math.abs(d), 0.6);
      }
      return bankTop + Math.pow(t, 1.7) * (H - bankTop) * 0.95 +
        bfrac[i] * 22 + bgrain[i] * 7 - lift;
    };

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fgLeft ? 0 : W, H + 10);
    for (var bi = 0; bi <= 96; bi++) {
      var bt = bi / 96;
      ctx.lineTo(fgLeft ? bt * W * 0.62 : W - bt * W * 0.62, bankEdge(bt));
    }
    ctx.lineTo(fgLeft ? W : 0, H + 10);
    ctx.closePath();
    ctx.clip();

    var bankG = ctx.createLinearGradient(0, bankTop - 40, 0, H);
    bankG.addColorStop(0, ink(0.60));
    bankG.addColorStop(0.45, ink(0.78));
    bankG.addColorStop(1, ink(0.54));
    ctx.fillStyle = bankG;
    ctx.fillRect(0, 0, W, H);

    /* Structure inside the mass: contours running parallel to the edge,
       then a few hard cracks across them. */
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var cline = 0; cline < 14; cline++) {
      var drop = 10 + cline * (14 + rng() * 12);
      ctx.strokeStyle = ink(0.10 + rng() * 0.26);
      ctx.lineWidth = 0.8 + rng() * 1.8;
      ctx.beginPath();
      var startT = rng() * 0.5;
      var endT = startT + 0.2 + rng() * 0.5;
      for (var ci = 0; ci <= 24; ci++) {
        var ct = startT + (endT - startT) * (ci / 24);
        var cx2 = fgLeft ? ct * W * 0.62 : W - ct * W * 0.62;
        var cy2 = bankEdge(ct) + drop + Math.sin(ci * 0.9 + cline) * 4;
        if (ci === 0) ctx.moveTo(cx2, cy2); else ctx.lineTo(cx2, cy2);
      }
      ctx.stroke();
    }
    for (var crack = 0; crack < 6; crack++) {
      var kt = rng() * 0.62;
      var kx = fgLeft ? kt * W * 0.62 : W - kt * W * 0.62;
      var ky = bankEdge(kt) + 6 + rng() * 90;
      ctx.strokeStyle = ink(0.22 + rng() * 0.34);
      ctx.lineWidth = 1 + rng() * 2;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      var px2 = kx, py2 = ky;
      for (var seg = 0; seg < 2; seg++) {
        px2 += (rng() - (fgLeft ? 0.25 : 0.75)) * 44;
        py2 += 12 + rng() * 26;
        ctx.lineTo(px2, py2);
      }
      ctx.stroke();
    }
    /* the wet line where the bank meets the water */
    ctx.strokeStyle = ink(0.55);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (var wi = 0; wi <= 96; wi++) {
      var wt = wi / 96;
      var wx2 = fgLeft ? wt * W * 0.62 : W - wt * W * 0.62;
      if (wi === 0) ctx.moveTo(wx2, bankEdge(wt) + 1.5);
      else ctx.lineTo(wx2, bankEdge(wt) + 1.5);
    }
    ctx.stroke();
    ctx.restore();

    /* --- trees ------------------------------------------------------------- */
    var treeCount = Math.max(1, Math.min(5,
      1 + Math.round(a.share[0] * 7 + dense * 1.2)));
    var anchor = fgLeft ? W * 0.09 : W * 0.91;
    for (var ti = 0; ti < treeCount; ti++) {
      var tx3 = anchor + (fgLeft ? 1 : -1) * ti * (46 + rng() * 30);
      var groundT = Math.min(1, Math.abs(tx3 - (fgLeft ? 0 : W)) / (W * 0.62));
      var ty3 = bankEdge(groundT) + 8;
      var th = (150 + rng() * 90) * (1 - ti * 0.09);
      if (chart.dayMaster === 0 || R.dominant === 0) pine(ctx, tx3, ty3, th, rng, 0.82);
      else if (chart.dayMaster === 1) bamboo(ctx, tx3, ty3, th * 0.9, rng, 0.72);
      else if (rng() < 0.5) pine(ctx, tx3, ty3, th * 0.92, rng, 0.78);
      else leafTree(ctx, tx3, ty3, th * 0.88, rng, 0.74);
    }

    /* --- what the ten gods put in the scene --------------------------------- */
    var lamp = (R.warmth === 'warm' || chart.dayMaster === 3) && night;
    if (R.staffage.draw === 'hut' || lamp) {
      var hx = fgLeft ? W * 0.30 : W * 0.70;
      var hgT = Math.min(1, Math.abs(hx - (fgLeft ? 0 : W)) / (W * 0.62));
      var hy = bankEdge(hgT) + 6;
      hut(ctx, hx, hy, 22, rng, 0.72, lamp);
    }
    if (R.staffage.draw === 'boat' || R.dominant === 4) {
      boat(ctx, W * (fgLeft ? 0.70 : 0.30), waterY + 60 + rng() * 70, 22, rng, 0.6);
    }
    if (R.staffage.draw === 'birds') {
      birds(ctx, W * (lightSide < 0 ? 0.10 : 0.62), H * 0.17,
        3 + Math.floor(rng() * 3), 12, rng, 0.36);
    }

    /* --- 浅绛: colour kept to a whisper -------------------------------------- */
    var wash = ctx.createLinearGradient(0, horizon - 160, 0, H);
    wash.addColorStop(0, 'rgba(' + accent.join(',') + ',0)');
    wash.addColorStop(0.5, 'rgba(' + accent.join(',') + ',0.09)');
    wash.addColorStop(1, 'rgba(' + accent.join(',') + ',0.04)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    if (R.weather.drama > 0) {
      /* wind pulled through the mist, in the paper's own colour */
      for (var wI = 0; wI < 4 * R.weather.drama; wI++) {
        var wy = mainBase - 200 + rng() * 260;
        var grad = ctx.createLinearGradient(0, wy, W, wy);
        grad.addColorStop(0, 'rgba(' + paper.join(',') + ',0)');
        grad.addColorStop(0.5, 'rgba(' + paper.join(',') + ',0.7)');
        grad.addColorStop(1, 'rgba(' + paper.join(',') + ',0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 5 + rng() * 9;
        ctx.beginPath();
        ctx.moveTo(-20, wy);
        ctx.quadraticCurveTo(W * 0.5, wy - 16 - rng() * 14, W + 20, wy + rng() * 12);
        ctx.stroke();
      }
    }

    /* --- 题款 and 印 ---------------------------------------------------------- */
    var serif = '"Songti SC","STSong","SimSun","Noto Serif SC","Source Han Serif SC",serif';
    /* Write in the emptier half — opposite the main peak. */
    var colX = mainX > 0.5 ? 62 : W - 62;
    var colY = 78;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink(0.74);
    ctx.font = '31px ' + serif;
    for (var c = 0; c < R.title.length; c++) ctx.fillText(R.title[c], colX, colY + c * 37);

    var sub = chart.list.map(function (p) { return p.text; }).join('');
    var subY = colY + R.title.length * 37 + 20;
    ctx.font = '17px ' + serif;
    ctx.fillStyle = ink(0.48);
    for (var c2 = 0; c2 < sub.length; c2++) ctx.fillText(sub[c2], colX, subY + c2 * 21);

    var sealSize = 42;
    var sealX = colX - sealSize / 2;
    var sealY = subY + sub.length * 21 + 12;
    ctx.fillStyle = 'rgba(168,48,38,0.9)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(sealX, sealY, sealSize, sealSize, 4);
    else ctx.rect(sealX, sealY, sealSize, sealSize);
    ctx.fill();
    ctx.fillStyle = paperCss;
    ctx.font = '17px ' + serif;
    ctx.fillText(chart.pillars.day.stemChar, sealX + sealSize * 0.5, sealY + sealSize * 0.30);
    ctx.fillText(chart.pillars.day.branchChar, sealX + sealSize * 0.5, sealY + sealSize * 0.71);

    /* --- aged edge ------------------------------------------------------------ */
    var vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.8);
    vig.addColorStop(0, 'rgba(116,96,66,0)');
    vig.addColorStop(1, 'rgba(116,96,66,0.14)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    return canvas;
  }

  return {
    buildReading: buildReading,
    buildPrompts: buildPrompts,
    paint: paint,
    ELEMENT_SCENE: ELEMENT_SCENE,
    HOUR_LIGHT: HOUR_LIGHT,
    GOD_STAFFAGE: GOD_STAFFAGE,
    hashString: hashString,
    mulberry32: mulberry32
  };
});
