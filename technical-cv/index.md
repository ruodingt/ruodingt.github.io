---
layout: cv
title: Technical Resume
description: "Technical resume for Rod (Ruoding) Tian — machine learning, data engineering, and platform work."
permalink: /technical-cv/
---

<div class="cv-print-link">
  <button type="button" class="print-btn" id="print-config-btn">Print / Save as PDF</button>
</div>

<div class="cv-header">
  <img class="cv-photo" src="{{ '/assets/img/headshot.jpg' | relative_url }}" alt="">
  <div class="cv-identity">
    <h1>{{ site.data.technical-cv.name }}</h1>
    <p class="cv-tagline">{{ site.data.technical-cv.tagline }}</p>
    <p class="cv-contact">{{ site.data.technical-cv.location }} &middot; <a href="mailto:{{ site.data.technical-cv.email }}">{{ site.data.technical-cv.email }}</a> &middot; <a href="{{ site.data.technical-cv.linkedin }}">{{ site.data.technical-cv.linkedin | remove: "https://www." | remove: "linkedin.com/in/" | remove: "/" }}</a></p>
  </div>
</div>

<section class="cv-section">
  <h2>Personal Statement</h2>
  {% for para in site.data.technical-cv.statement %}
  <p class="cv-statement">{{ para }}</p>
  {% endfor %}
</section>

<section class="cv-section">
  <h2>Professional Experience</h2>
  {% for job in site.data.technical-cv.experience %}
  <div class="cv-entry" data-entry-index="{{ forloop.index0 }}">
    <div class="cv-entry-head">
      <span class="cv-entry-title">{{ job.title }}{% if job.company %} &middot; <span class="cv-entry-company">{{ job.company }}</span>{% endif %}</span>
      <span class="cv-entry-dates">{{ job.dates }}{% if job.location %} &middot; {{ job.location }}{% endif %}</span>
    </div>
    {% if job.context %}<p class="cv-entry-context">{{ job.context }}</p>{% endif %}
    {% if job.achievements %}
    <ul>
      {% for item in job.achievements %}
      <li>{{ item | markdownify }}</li>
      {% endfor %}
    </ul>
    {% endif %}
  </div>
  {% endfor %}
</section>

<section class="cv-section">
  <h2>Education</h2>
  {% for edu in site.data.technical-cv.education %}
  <div class="cv-edu-entry">
    <div class="cv-edu-head">
      <span class="cv-edu-degree">{{ edu.degree }} &middot; <span class="cv-edu-institution">{{ edu.institution }}</span></span>
      <span class="cv-entry-dates">{{ edu.dates }}</span>
    </div>
    {% if edu.note %}<p class="cv-edu-note">{{ edu.note }}</p>{% endif %}
  </div>
  {% endfor %}
</section>

<!-- Print configuration modal -->
<div class="print-modal" id="print-modal" hidden>
  <div class="print-modal-backdrop"></div>
  <div class="print-modal-body">
    <div class="print-modal-header">
      <h3>Print Settings</h3>
      <button type="button" class="print-modal-close" id="print-modal-close">&times;</button>
    </div>

    <div class="print-modal-section">
      <label class="print-modal-label">Font size</label>
      <div class="print-font-row">
        <input type="range" id="print-font-slider" min="85" max="115" step="5" value="100">
        <span id="print-font-value">100%</span>
      </div>
      <div class="print-font-presets" id="print-font-presets"></div>
    </div>

    <div class="print-modal-section">
      <label class="print-modal-label">Include in print</label>
      <div class="print-entry-controls">
        <button type="button" class="print-link-btn" id="print-select-all">Select all</button>
        <span>&middot;</span>
        <button type="button" class="print-link-btn" id="print-deselect-all">Deselect all</button>
      </div>
      <div id="print-entries"></div>
    </div>

    <button type="button" class="print-btn print-modal-print" id="print-go">Print</button>
  </div>
</div>

<script>
(function() {
  var printConfig = {{ site.data.technical-cv.print | jsonify }};
  var modal = document.getElementById('print-modal');
  var slider = document.getElementById('print-font-slider');
  var fontValue = document.getElementById('print-font-value');
  var presetsContainer = document.getElementById('print-font-presets');
  var entriesContainer = document.getElementById('print-entries');

  function ptToPercent(pt) {
    return Math.round((pt / 10) * 100);
  }

  function percentToPt(pct) {
    return (pct / 100) * 10;
  }

  // Populate font presets
  printConfig.font_presets.forEach(function(preset) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'print-preset-btn';
    btn.textContent = preset.label;
    btn.dataset.pt = preset.size.replace('pt', '');
    btn.addEventListener('click', function() {
      var pt = parseFloat(btn.dataset.pt);
      slider.value = ptToPercent(pt);
      fontValue.textContent = slider.value + '%';
      highlightPreset(btn.dataset.pt);
    });
    presetsContainer.appendChild(btn);
  });

  // Populate entry checkboxes
  printConfig.entries.forEach(function(entry, i) {
    var label = document.createElement('label');
    label.className = 'print-entry-toggle';

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = entry.default;
    cb.dataset.index = i;

    var span = document.createElement('span');
    span.textContent = entry.label;

    label.appendChild(cb);
    label.appendChild(span);
    entriesContainer.appendChild(label);
  });

  function highlightPreset(pt) {
    var btns = presetsContainer.querySelectorAll('.print-preset-btn');
    btns.forEach(function(b) {
      b.classList.toggle('active', b.dataset.pt === String(pt));
    });
  }

  // Slider input
  slider.addEventListener('input', function() {
    fontValue.textContent = slider.value + '%';
    highlightPreset(String(percentToPt(parseFloat(slider.value))));
  });

  // Open modal
  document.getElementById('print-config-btn').addEventListener('click', function() {
    modal.hidden = false;
  });

  // Close modal
  document.getElementById('print-modal-close').addEventListener('click', function() {
    modal.hidden = true;
  });
  document.querySelector('.print-modal-backdrop').addEventListener('click', function() {
    modal.hidden = true;
  });

  // Select all / Deselect all
  document.getElementById('print-select-all').addEventListener('click', function() {
    entriesContainer.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = true; });
  });
  document.getElementById('print-deselect-all').addEventListener('click', function() {
    entriesContainer.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
  });

  // Print
  document.getElementById('print-go').addEventListener('click', function() {
    var fontPt = percentToPt(parseFloat(slider.value));
    var cv = document.querySelector('.cv');

    // Apply font size
    document.documentElement.style.setProperty('--cv-print-font-size', fontPt + 'pt');

    // Toggle entry visibility
    var entries = document.querySelectorAll('.cv-entry');
    var checkboxes = entriesContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(function(cb) {
      var idx = parseInt(cb.dataset.index, 10);
      if (entries[idx]) {
        entries[idx].classList.toggle('cv-entry-hidden', !cb.checked);
      }
    });

    modal.hidden = true;

    function restore() {
      document.documentElement.style.removeProperty('--cv-print-font-size');
      entries.forEach(function(e) { e.classList.remove('cv-entry-hidden'); });
    }

    if (window.matchMedia) {
      var mql = window.matchMedia('print');
      function onChange(e) {
        if (!e.matches) {
          restore();
          mql.removeListener(onChange);
        }
      }
      mql.addListener(onChange);
    }
    setTimeout(restore, 3000);

    window.print();
  });

  // Escape key closes modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !modal.hidden) {
      modal.hidden = true;
    }
  });
})();
</script>
