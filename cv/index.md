---
layout: cv
title: CV
permalink: /cv/
---

<div class="cv-print-link">
  <button type="button" class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <span>Turn off &ldquo;Headers and footers&rdquo; in the print dialog so no URL, date, or page number is stamped into the margins.</span>
</div>

<div class="cv-header">
  <div>
    <h1>{{ site.data.cv.name }}</h1>
    <p class="cv-tagline">{{ site.data.cv.tagline }}</p>
  </div>
  <div class="cv-contact">
    <div>{{ site.data.cv.location }}</div>
    <div><a href="mailto:{{ site.data.cv.email }}">{{ site.data.cv.email }}</a></div>
    <div>{{ site.data.cv.phone }}</div>
    <div><a href="{{ site.data.cv.linkedin }}">{{ site.data.cv.linkedin | remove: "https://www." }}</a></div>
  </div>
</div>

<p class="cv-summary">{{ site.data.cv.summary }}</p>

<section class="cv-section">
  <h2>Experience</h2>
  {% for job in site.data.cv.experience %}
  <div class="cv-entry">
    <div class="cv-entry-head">
      <span class="cv-entry-title">{{ job.title }} &middot; <span class="cv-entry-company">{{ job.company }}</span></span>
      <span class="cv-entry-dates">{{ job.dates }} &middot; {{ job.location }}</span>
    </div>
    <p class="cv-entry-context">{{ job.context }}</p>
    <ul>
      {% for item in job.achievements %}
      <li>{{ item }}</li>
      {% endfor %}
    </ul>
  </div>
  {% endfor %}
</section>

<section class="cv-section">
  <h2>Education</h2>
  {% for edu in site.data.cv.education %}
  <div class="cv-edu-entry">
    <div class="cv-edu-head">
      <span class="cv-edu-degree">{{ edu.degree }} &middot; <span class="cv-edu-institution">{{ edu.institution }}</span></span>
      <span class="cv-entry-dates">{{ edu.dates }} &middot; {{ edu.location }}</span>
    </div>
    <p class="cv-edu-note">{{ edu.note }}</p>
  </div>
  {% endfor %}
</section>

<section class="cv-section">
  <h2>Skills</h2>
  <ul class="cv-skills">
    {% for skill in site.data.cv.skills %}
    <li>{{ skill }}</li>
    {% endfor %}
  </ul>
</section>
