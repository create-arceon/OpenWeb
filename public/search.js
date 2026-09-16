(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const query = (params.get("q") || "").trim();
  let tab = params.get("tab") || "web";
  let page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const perPage = 10;

  const input = document.getElementById("search-input");
  const results = document.getElementById("results");
  const pagination = document.getElementById("pagination");
  const summary = document.getElementById("summary");
  const sort = document.getElementById("sort");
  const recentBox = document.getElementById("recent-searches");

  if (input) input.value = query;

  const esc = s => String(s ?? "");
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  function normalizeUrl(raw) {
    try {
      const u = new URL(raw, location.origin);
      u.hash = "";
      u.hostname = u.hostname.toLowerCase();
      [
        "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
        "gclid","fbclid","msclkid","mc_cid","mc_eid"
      ].forEach(k => u.searchParams.delete(k));
      if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
      return u.toString();
    } catch { return esc(raw).trim().replace(/#.*$/, "").replace(/\/$/, ""); }
  }

  function domainOf(url) {
    try { return new URL(url, location.origin).hostname.replace(/^www\./, ""); }
    catch { return ""; }
  }

  function textOf(x) {
    return [
      x.title, x.name, x.description, x.snippet, x.content,
      x.text, x.category, x.categories, x.brand, x.source
    ].filter(Boolean).join(" ");
  }

  function score(x) {
    const hay = textOf(x).toLowerCase();
    let n = Number(x.score) || 0;
    for (const t of terms) {
      if (String(x.title || x.name || "").toLowerCase().includes(t)) n += 12;
      if (String(x.description || x.snippet || "").toLowerCase().includes(t)) n += 6;
      if (hay.includes(t)) n += 2;
    }
    return n;
  }

  function dedupe(list) {
    const seenUrl = new Set(), seenContent = new Set(), out = [];
    for (const x of list) {
      const url = normalizeUrl(x.url || x.link || x.href || "");
      const title = esc(x.title || x.name || "").toLowerCase().replace(/\s+/g, " ").trim();
      const desc = esc(x.description || x.snippet || x.content || "").toLowerCase()
        .replace(/\s+/g, " ").trim().slice(0, 220);
      const contentKey = title + "|" + desc;
      if (url && seenUrl.has(url)) continue;
      if (contentKey !== "|" && seenContent.has(contentKey)) continue;
      if (url) seenUrl.add(url);
      if (contentKey !== "|") seenContent.add(contentKey);
      out.push({...x, __url:url, __score:score(x)});
    }
    return out;
  }

  function hasType(x, type) {
    const s = [
      x.type,x.category,x.categories,x.kind,x.section,x.vertical,x.source_type
    ].filter(Boolean).join(" ").toLowerCase();
    if (type === "shopping") return /shop|shopping|product|produit|prix|price|commerce|store/.test(s) ||
      x.price != null || x.currency != null || x.seller != null || x.brand != null;
    if (type === "news") return /news|actualité|actualites|actualités|article|press|presse/.test(s) ||
      x.publishedAt != null || x.published_at != null || x.date != null || x.pubDate != null;
    return true;
  }

  function imageKey(raw) {
    try {
      const u = new URL(raw, location.origin);
      u.hash = "";
      ["w","width","h","height","size","resize","quality","q","fit","fm","format"].forEach(k => u.searchParams.delete(k));
      return u.toString().toLowerCase();
    } catch { return String(raw || "").split("#")[0].toLowerCase(); }
  }

  function uniqueImages(list) {
    const seen = new Set();
    return list.filter(x => {
      const src = imageKey(x.image || x.imageUrl || x.thumbnail || x.thumbnailUrl || "");
      if (!src || seen.has(src)) return false;
      seen.add(src); return true;
    });
  }

  function sortList(list) {
    const mode = sort.value;
    return [...list].sort((a,b) => {
      if (mode === "title") return esc(a.title||a.name).localeCompare(esc(b.title||b.name), "fr");
      if (mode === "domain") return domainOf(a.__url).localeCompare(domainOf(b.__url));
      if (mode === "date") return String(b.date||b.publishedAt||b.published_at||b.pubDate||"").localeCompare(String(a.date||a.publishedAt||a.published_at||a.pubDate||""));
      return b.__score - a.__score;
    });
  }

  function el(tag, attrs={}, text="") {
    const e = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k === "href") e.href = v;
      else e.setAttribute(k,v);
    }
    if (text) e.textContent = text;
    return e;
  }

  function renderRecent() {
    recentBox.replaceChildren();
    let history = [];
    try { history = JSON.parse(localStorage.getItem("openweb-searches") || "[]"); } catch {}
    if (!history.length) return;
    const label = el("span", {}, "Déjà recherché :");
    recentBox.append(label);
    history.slice(0,6).forEach(q => {
      const a = el("a", {href:"/search.html?q="+encodeURIComponent(q)}, q);
      recentBox.append(a);
    });
  }

  function saveSearch() {
    if (!query) return;
    let h=[]; try { h=JSON.parse(localStorage.getItem("openweb-searches")||"[]"); } catch {}
    h=[query,...h.filter(x=>x.toLowerCase()!==query.toLowerCase())].slice(0,10);
    localStorage.setItem("openweb-searches", JSON.stringify(h));
  }

  function setTabs() {
    document.querySelectorAll(".navtab").forEach(a => {
      const t=a.dataset.tab;
      a.classList.toggle("active", t===tab);
      a.href="/search.html?q="+encodeURIComponent(query)+(t==="web"?"":"&tab="+t);
      a.addEventListener("click", () => { tab=t; page=1; });
    });
  }

  function renderComingSoon(type) {
    results.replaceChildren();
    pagination.replaceChildren();
    const box=el("div",{class:"coming-soon"});
    const title=type==="shopping" ? "Shopping OpenWeb" : "Actualités OpenWeb";
    const p1=type==="shopping"
      ? "La recherche Shopping est en préparation."
      : "La recherche Actualités est en préparation.";
    const p2="Cette section sortira dans pas longtemps. Les résultats seront alimentés par le crawler OpenWeb.";
    box.append(el("h2",{},title),el("p",{},p1),el("p",{},p2));
    results.append(box);
    summary.textContent="Fonctionnalité bientôt disponible";
  }

  function renderImages(list) {
    const images = uniqueImages(list);
    const start = (page - 1) * perPage;
    const slice = images.slice(start, start + perPage);

    results.replaceChildren();
    if (!images.length) {
      results.append(el("div",{class:"no-results"},"Aucune image trouvée."));
      pagination.replaceChildren();
      return;
    }

    const grid = el("div",{class:"image-grid"});
    const frag = document.createDocumentFragment();

    slice.forEach(x => {
      const src = esc(x.image || x.imageUrl || x.thumbnail || x.thumbnailUrl);
      const card = el("div",{class:"image-card",tabindex:"0"});
      const frame = el("div",{class:"image-frame"});
      const loading = el("div",{class:"image-loading"},"Chargement…");
      const img = el("img",{alt:esc(x.title || x.name || "Image OpenWeb")});
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.src = src;

      img.addEventListener("load", () => loading.remove(), {once:true});
      img.addEventListener("error", () => {
        frame.replaceChildren(el("div",{class:"image-error"},"Image indisponible"));
      }, {once:true});

      frame.append(loading,img);

      const caption = el("div",{class:"image-caption"},
        esc(x.title || x.name || domainOf(x.__url) || "Image"));
      const domain = el("div",{class:"image-domain"},domainOf(x.__url));
      caption.append(domain);
      card.append(frame,caption);

      const open = () => {
        const modal = document.getElementById("modal");
        document.getElementById("modal-image").src = src;
        document.getElementById("modal-image").alt = img.alt;
        modal.classList.add("open");
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
      frag.append(card);
    });

    grid.append(frag);
    results.append(grid);
    renderPagination(images.length);
  }

  function renderWeb(list) {
    const filtered=sortList(list);
    const start=(page-1)*perPage, slice=filtered.slice(start,start+perPage);
    results.replaceChildren();
    if(!filtered.length){ results.append(el("div",{class:"no-results"},"Aucun résultat pour cette recherche.")); pagination.replaceChildren(); return; }
    slice.forEach(x=>{
      const card=el("article",{class:"result-card"});
      const title=el("h2",{class:"result-title"});
      const a=el("a",{href:x.__url||"#"},esc(x.title||x.name||x.__url));
      a.target="_self";
      title.append(a);
      const url=el("div",{class:"result-url"},x.__url||"");
      const desc=el("p",{class:"result-desc"},esc(x.description||x.snippet||x.content||x.text||""));
      card.append(title,url,desc);
      const meta=[];
      if(x.date||x.publishedAt||x.published_at||x.pubDate) meta.push(String(x.date||x.publishedAt||x.published_at||x.pubDate));
      if(x.source) meta.push(String(x.source));
      if(meta.length) card.append(el("div",{class:"result-meta"},meta.join(" · ")));
      results.append(card);
    });
    renderPagination(filtered.length);
    if(params.get("lucky")==="1" && filtered[0]?.__url) location.href=filtered[0].__url;
  }

  function renderPagination(total) {
    pagination.replaceChildren();
    const pages=Math.ceil(total/perPage);
    if(pages<=1) return;
    const add=(label,p,disabled,current)=>{
      const b=el("button",{type:"button"},label);
      b.disabled=!!disabled; if(current)b.classList.add("current");
      b.addEventListener("click",()=>{page=p; renderCurrent(); window.scrollTo({top:0,behavior:"smooth"});});
      pagination.append(b);
    };
    add("‹",Math.max(1,page-1),page===1,false);
    const from=Math.max(1,page-2),to=Math.min(pages,page+2);
    if(from>1){add("1",1,false,page===1); if(from>2) pagination.append(el("span",{},"…"));}
    for(let p=from;p<=to;p++) add(String(p),p,false,p===page);
    if(to<pages){if(to<pages-1)pagination.append(el("span",{},"…"));add(String(pages),pages,false,page===pages);}
    add("›",Math.min(pages,page+1),page===pages,false);
  }

  let data=[];
  async function load() {
    try {
      const r=await fetch("/searchData.json",{cache:"no-store"});
      if(!r.ok) throw new Error("HTTP "+r.status);
      const json=await r.json();
      data=Array.isArray(json)?json:(Array.isArray(json.results)?json.results:[]);
      saveSearch(); renderRecent(); setTabs(); renderCurrent();
    } catch(e) {
      results.replaceChildren(el("div",{class:"no-results"},"Impossible de charger les résultats."));
      summary.textContent="Erreur de chargement";
      console.error(e);
    }
  }

  function renderCurrent() {
    setTabs();
    page=Math.max(1,page);
    if(tab==="shopping"){
      const shop=dedupe(data.filter(x=>hasType(x,"shopping")));
      if(shop.length) renderWeb(shop); else renderComingSoon("shopping");
      return;
    }
    if(tab==="news"){
      const news=dedupe(data.filter(x=>hasType(x,"news")));
      if(news.length) renderWeb(news); else renderComingSoon("news");
      return;
    }
    if(tab==="images"){
      const matched=data.filter(x=>{
        const hay=textOf(x).toLowerCase();
        return !terms.length || terms.every(t=>hay.includes(t));
      });
      renderImages(dedupe(matched));
      summary.textContent=`Images · ${uniqueImages(dedupe(matched)).length} résultat(s)`;
      return;
    }
    const matched=data.filter(x=>{
      const hay=textOf(x).toLowerCase();
      return !terms.length || terms.every(t=>hay.includes(t));
    });
    const list=dedupe(matched);
    summary.textContent=`Environ ${list.length} résultat(s)`;
    renderWeb(list);
  }

  sort.addEventListener("change",()=>{page=1;renderCurrent();});
  document.getElementById("modal-close").addEventListener("click",()=>document.getElementById("modal").classList.remove("open"));
  document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")e.currentTarget.classList.remove("open")});
  document.getElementById("search-form").addEventListener("submit",e=>{
    e.preventDefault();
    const q=input.value.trim();
    location.href="/search.html?q="+encodeURIComponent(q)+(tab==="web"?"":"&tab="+tab);
  });

  load();
})();