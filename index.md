---
layout: default
---

<div class="home-hero">
  <img src="{{ '/assets/img/headshot.jpg' | relative_url }}" alt="Rod (Ruoding) Tian">
  <div>
    <h1>Rod (Ruoding) Tian</h1>
    <p class="tagline">Founding Engineer &mdash; Melbourne, Australia</p>
  </div>
</div>

{% for paragraph in site.data.cv.statement %}
<p>{{ paragraph }}</p>
{% endfor %}

<div class="home-cards">
  <a class="home-card" href="{{ '/board-cv/' | relative_url }}">
    <span class="home-card-title">Board CV</span>
    <span class="home-card-desc">Engineering leadership for board and governance contexts</span>
  </a>
  <a class="home-card" href="{{ '/technical-cv/' | relative_url }}">
    <span class="home-card-title">Tech CV</span>
    <span class="home-card-desc">ML, data engineering, and platform work</span>
  </a>
  <a class="home-card" href="{{ '/blog/' | relative_url }}">
    <span class="home-card-title">Blog</span>
    <span class="home-card-desc">Writing on art, books, and the systems people live inside</span>
  </a>
</div>
