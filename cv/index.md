---
layout: cv
title: Board CV
title_override: "Rod Tian Board CV"
permalink: /board-cv/
---

<div class="cv-print-link">
  <button type="button" class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</div>

<div class="cv-header">
  <img class="cv-photo" src="{{ '/assets/img/headshot.jpg' | relative_url }}" alt="">
  <div class="cv-identity">
    <h1>{{ site.data.cv.name }}</h1>
    <p class="cv-tagline">{{ site.data.cv.current_role }}</p>
  </div>
  <div class="cv-contact">
    <div>{{ site.data.cv.location }}</div>
    <div><a href="mailto:{{ site.data.cv.email }}">{{ site.data.cv.email }}</a></div>
    <div>{{ site.data.cv.phone }}</div>
    <div><a href="{{ site.data.cv.linkedin }}">{{ site.data.cv.linkedin | remove: "https://www." }}</a></div>
  </div>
</div>

<section class="cv-section">
  <h2>Personal Statement</h2>
  {% for para in site.data.cv.statement %}
  <p class="cv-statement">{% if para contains "[TO ADD" %}<span class="cv-todo">{{ para }}</span>{% else %}{{ para }}{% endif %}</p>
  {% endfor %}
</section>

<section class="cv-section">
  <h2>Key Skills and Attributes</h2>
  <ul class="cv-attributes">
    {% for a in site.data.cv.attributes %}
    <li><strong>{{ a.title }}.</strong> {{ a.detail }}</li>
    {% endfor %}
  </ul>
</section>

<section class="cv-section">
  <h2>Professional Experience</h2>
  {% for job in site.data.cv.experience %}
  <div class="cv-entry">
    <div class="cv-entry-head">
      <span class="cv-entry-title">{{ job.title }}{% if job.company %} &middot; <span class="cv-entry-company">{{ job.company }}</span>{% endif %}</span>
      <span class="cv-entry-dates">{{ job.dates }}{% if job.location %} &middot; {{ job.location }}{% endif %}</span>
    </div>
    <ul>
      {% for item in job.achievements %}
      <li>{% if item contains "[TO ADD" %}<span class="cv-todo">{{ item }}</span>{% else %}{{ item }}{% endif %}</li>
      {% endfor %}
    </ul>
  </div>
  {% endfor %}
</section>

<section class="cv-section">
  <h2>Community and Mentoring</h2>
  <ul class="cv-attributes">
    {% for c in site.data.cv.community %}
    <li>{% if c.title contains "[TO ADD" or c.detail contains "[TO ADD" %}<span class="cv-todo"><strong>{{ c.title }}.</strong> {{ c.detail }}</span>{% else %}<strong>{{ c.title }}.</strong> {{ c.detail }}{% endif %}</li>
    {% endfor %}
  </ul>
</section>

<section class="cv-section">
  <h2>Education and Professional Development</h2>
  {% for edu in site.data.cv.education %}
  <div class="cv-edu-entry">
    <div class="cv-edu-head">
      <span class="cv-edu-degree">{{ edu.degree }} &middot; <span class="cv-edu-institution">{% if edu.institution_url %}<a href="{{ edu.institution_url }}">{{ edu.institution }}</a>{% else %}{{ edu.institution }}{% endif %}</span></span>
      <span class="cv-entry-dates">{{ edu.dates }}</span>
    </div>
    {% if edu.note %}<p class="cv-edu-note">{{ edu.note }}</p>{% endif %}
  </div>
  {% endfor %}
  <p class="cv-languages"><strong>Languages:</strong> {{ site.data.cv.languages }}</p>
</section>
