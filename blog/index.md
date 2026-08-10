---
layout: default
title: Blog
permalink: /blog/
---

<ul class="post-list">
  {% for post in site.posts %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%B %-d, %Y" }}</time>
  </li>
  {% endfor %}
  {% if site.posts.size == 0 %}
  <li>No posts yet &mdash; check back soon.</li>
  {% endif %}
</ul>
