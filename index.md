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

<!-- Homepage intro is single-sourced from the Board CV's personal statement
     (_data/cv.yml). When an Engineer CV exists, switch the source here. -->
{% for paragraph in site.data.cv.statement %}
<p>{{ paragraph }}</p>
{% endfor %}

<div class="home-links">
  <a href="{{ '/board-cv/' | relative_url }}">View CV</a>
  <a href="{{ '/blog/' | relative_url }}">Read the blog</a>
</div>
