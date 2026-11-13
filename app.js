// Lerntool – die ganze Logik der App.
// Nur einfaches JavaScript, keine Bibliotheken.

"use strict";

const SPEICHER_KEY = "lerntool-daten";

/* =========================================================
   Hilfsfunktionen
   ========================================================= */

function neueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Mischt eine Liste zufällig (gibt eine neue Liste zurück).
function mischen(liste) {
  const kopie = liste.slice();
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

function wortZahl(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* =========================================================
   Datum (immer lokale Zeit, Format JJJJ-MM-TT)
   ========================================================= */

function datumZuText(datum) {
  const j = datum.getFullYear();
  const m = String(datum.getMonth() + 1).padStart(2, "0");
  const t = String(datum.getDate()).padStart(2, "0");
  return j + "-" + m + "-" + t;
}

function textZuDatum(text) {
  const [j, m, t] = text.split("-").map(Number);
  return new Date(j, m - 1, t);
}

function heuteText() {
  return datumZuText(new Date());
}

// Anzahl Tage von "von" bis "bis" (beides JJJJ-MM-TT).
function tageZwischen(von, bis) {
  const [j1, m1, t1] = von.split("-").map(Number);
  const [j2, m2, t2] = bis.split("-").map(Number);
  return Math.round((Date.UTC(j2, m2 - 1, t2) - Date.UTC(j1, m1 - 1, t1)) / 86400000);
}

function tagPlus(text, anzahl) {
  const datum = textZuDatum(text);
  datum.setDate(datum.getDate() + anzahl);
  return datumZuText(datum);
}

function datumAnzeigen(text) {
  return textZuDatum(text).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* =========================================================
   Lernplan berechnen
   ========================================================= */

// Verteilt alle offenen Themen auf die Tage von heute bis zum Tag vor der Prüfung.
// Erledigte Themen behalten ihren Tag.
// Gibt null zurück, wenn die Prüfung heute oder vorbei ist.
// Sonst: { lerntage, wiederholung: [Datumstexte] }
function planBerechnen(themen, pruefungsdatum, heute) {
  const tage = tageZwischen(heute, pruefungsdatum);
  if (tage <= 0) return null;

  const wiederholungGewuenscht = tage <= 7 ? 1 : 2;
  const lerntage = Math.max(1, tage - wiederholungGewuenscht);
  const wiederholungstage = tage - lerntage;

  const offen = themen.filter((t) => !t.erledigt);
  offen.forEach((thema, i) => {
    const tagNummer = Math.floor((i * lerntage) / offen.length);
    thema.tag = tagPlus(heute, tagNummer);
  });

  const wiederholung = [];
  for (let k = 0; k < wiederholungstage; k++) {
    wiederholung.push(tagPlus(heute, lerntage + k));
  }
  return { lerntage, wiederholung };
}

/* =========================================================
   Karteikarten aus Text erzeugen
   ========================================================= */

// Wörter, die am Satzanfang kein Begriff sind ("Es ist ...").
const KEINE_BEGRIFFE = ["es", "das", "dies", "dieses", "er", "sie", "man", "hier", "da", "dort", "was", "wer", "wie", "wo", "so"];

// Sucht im Text nach drei Mustern:
// 1. "Begriff: Erklärung"
// 2. "Begriff ist/sind ..."
// 3. "**fetter Begriff**"
// Jede Karte: { id, typ, frage, antwort, begriff }
function kartenErzeugen(text) {
  const karten = [];
  const schonDa = new Set();

  function hinzufuegen(typ, frage, antwort, begriff) {
    frage = frage.trim();
    antwort = antwort.trim();
    begriff = begriff.trim();
    if (!frage || !antwort || !begriff) return;
    const schluessel = (frage + "|" + antwort).toLowerCase();
    if (schonDa.has(schluessel)) return;
    schonDa.add(schluessel);
    karten.push({ id: neueId(), typ, frage, antwort, begriff });
  }

  const zeilen = text.split(/\r?\n/);
  for (const roheZeile of zeilen) {
    // Aufzählungszeichen und Markdown-Überschriften entfernen
    const zeile = roheZeile
      .trim()
      .replace(/^#+\s+/, "")
      .replace(/^([-*•]|\d+[.)])\s+/, "")
      .trim();
    if (!zeile) continue;

    // Muster 1: "Begriff: Erklärung"
    const definition = zeile.match(/^([^:]+):\s*(.+)$/);
    if (definition) {
      const begriff = definition[1].replace(/\*\*/g, "").trim();
      const erklaerung = definition[2].replace(/\*\*/g, "").trim();
      if (begriff && erklaerung && wortZahl(begriff) <= 5) {
        hinzufuegen("definition", begriff, erklaerung, begriff);
        continue;
      }
    }

    // Sonst Satz für Satz prüfen
    const saetze = zeile.split(/(?<=[.!?])\s+/);
    for (const satz of saetze) {
      // Muster 3: **fetter Begriff**
      const fett = [...satz.matchAll(/\*\*([^*]+)\*\*/g)];
      if (fett.length > 0) {
        for (const treffer of fett) {
          const begriff = treffer[1].trim();
          const frage = satz.replace(treffer[0], "_____").replace(/\*\*/g, "");
          hinzufuegen("luecke", frage, begriff, begriff);
        }
        continue;
      }

      // Muster 2: "Begriff ist/sind ..." (Begriff höchstens 5 Wörter)
      const istSatz = satz.match(/^((?:\S+\s+){0,4}?\S+)\s+(ist|sind)\s+(.+)$/);
      if (istSatz) {
        const begriff = istSatz[1].trim();
        if (KEINE_BEGRIFFE.includes(begriff.toLowerCase())) continue;
        const frage = "_____ " + istSatz[2] + " " + istSatz[3];
        hinzufuegen("luecke", frage, begriff, begriff);
      }
    }
  }
  return karten;
}

/* =========================================================
   Quiz erstellen
   ========================================================= */

// Gibt eine Liste von Fragen zurück oder null, wenn es weniger als 4 Begriffe gibt.
function quizErstellen(karten) {
  const begriffe = [];
  const gesehen = new Set();
  for (const karte of karten) {
    const klein = karte.begriff.toLowerCase();
    if (!gesehen.has(klein)) {
      gesehen.add(klein);
      begriffe.push(karte.begriff);
    }
  }
  if (begriffe.length < 4) return null;

  return mischen(karten)
    .slice(0, 10)
    .map((karte) => {
      const richtig = karte.begriff;
      const falsche = mischen(
        begriffe.filter((b) => b.toLowerCase() !== richtig.toLowerCase())
      ).slice(0, 3);
      return {
        typ: karte.typ,
        text: karte.typ === "definition" ? karte.antwort : karte.frage,
        richtig,
        optionen: mischen([richtig, ...falsche]),
      };
    });
}

/* =========================================================
   Countdown und Fortschritt (für die Startseite)
   ========================================================= */

// Farbstufe und Text für den Countdown bis zur Prüfung.
function countdownInfo(pruefungsdatum, heute) {
  const tage = tageZwischen(heute, pruefungsdatum);
  if (tage < 0) return { stufe: "vorbei", text: "Prüfung vorbei" };
  if (tage === 0) return { stufe: "rot", text: "Prüfung heute" };
  const text = "noch " + tage + (tage === 1 ? " Tag" : " Tage");
  if (tage >= 15) return { stufe: "gruen", text };
  if (tage >= 7) return { stufe: "gelb", text };
  return { stufe: "rot", text };
}

// Wie viele Themen eines Moduls erledigt sind.
function fortschritt(modul) {
  const gesamt = modul.themen.length;
  const erledigt = modul.themen.filter((t) => t.erledigt).length;
  const prozent = gesamt === 0 ? 0 : Math.round((erledigt / gesamt) * 100);
  return { erledigt, gesamt, prozent };
}

/* =========================================================
   Speichern und Laden
   ========================================================= */

let daten = { module: [] };

function laden() {
  try {
    const roh = localStorage.getItem(SPEICHER_KEY);
    if (!roh) return { module: [] };
    const gelesen = JSON.parse(roh);
    if (!gelesen || !Array.isArray(gelesen.module)) return { module: [] };
    for (const modul of gelesen.module) {
      modul.themen = modul.themen || [];
      modul.unterlagen = modul.unterlagen || [];
      modul.wiederholung = modul.wiederholung || [];
    }
    return gelesen;
  } catch (fehler) {
    return { module: [] };
  }
}

function speichern() {
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify(daten));
    return true;
  } catch (fehler) {
    alert(
      "Speichern hat nicht geklappt. Wahrscheinlich ist der Speicher im Browser voll. " +
        "Lösche alte Unterlagen und versuche es noch einmal."
    );
    return false;
  }
}

function planNeuBerechnen(modul) {
  const ergebnis = planBerechnen(modul.themen, modul.pruefungsdatum, heuteText());
  modul.wiederholung = ergebnis ? ergebnis.wiederholung : [];
  return ergebnis !== null;
}

function alleKarten(modul) {
  return modul.unterlagen.flatMap((u) => u.karten);
}

/* =========================================================
   Bausteine für die Oberfläche
   ========================================================= */

// Erzeugt ein HTML-Element. Text wird immer sicher als Text eingefügt.
function el(tag, eigenschaften, ...kinder) {
  const element = document.createElement(tag);
  if (eigenschaften) {
    for (const [name, wert] of Object.entries(eigenschaften)) {
      if (wert === undefined || wert === null || wert === false) continue;
      if (name === "text") element.textContent = wert;
      else if (name === "class") element.className = wert;
      else if (name.startsWith("on")) element.addEventListener(name.slice(2), wert);
      else if (name in element) element[name] = wert;
      else element.setAttribute(name, wert);
    }
  }
  for (const kind of kinder.flat()) {
    if (kind === null || kind === undefined || kind === false) continue;
    element.append(kind instanceof Node ? kind : String(kind));
  }
  return element;
}

function abschnitt(...kinder) {
  return el("section", { class: "abschnitt" }, ...kinder);
}

function zurueckLink(href, text) {
  return el("a", { href, class: "zurueck", text: "← " + text });
}

/* =========================================================
   Ansichten
   ========================================================= */

let sitzung = null; // laufende Karteikarten- oder Quiz-Runde
let aktuelleRoute = null;
let meldung = null; // kurze Erfolgsmeldung für die nächste Anzeige

// ---------- Startseite ----------

function zeigeStart() {
  // Nächste Prüfung zuerst, vergangene Prüfungen ans Ende.
  const heute = heuteText();
  const liste = daten.module.slice().sort((a, b) => {
    const aVorbei = a.pruefungsdatum < heute;
    const bVorbei = b.pruefungsdatum < heute;
    if (aVorbei !== bVorbei) return aVorbei ? 1 : -1;
    return a.pruefungsdatum.localeCompare(b.pruefungsdatum);
  });

  const uebersicht = abschnitt(
    el("h2", { text: "Meine Module" }),
    liste.length === 0
      ? el("p", {
          class: "hinweis",
          text:
            "Willkommen! Lege unten dein erstes Modul mit dem Prüfungsdatum an. " +
            "Danach kannst du Themen planen und Unterlagen hinzufügen.",
        })
      : el(
          "ul",
          { class: "modulliste" },
          liste.map((modul) => el("li", null, modulKarte(modul)))
        )
  );

  const nameFeld = el("input", { type: "text", id: "neu-name", required: true, maxLength: 100 });
  const datumFeld = el("input", { type: "date", id: "neu-datum", required: true });
  const formular = el(
    "form",
    {
      onsubmit: (e) => {
        e.preventDefault();
        const name = nameFeld.value.trim();
        if (!name || !datumFeld.value) {
          alert("Bitte gib einen Namen und ein Prüfungsdatum ein.");
          return;
        }
        const modul = {
          id: neueId(),
          name,
          pruefungsdatum: datumFeld.value,
          themen: [],
          unterlagen: [],
          wiederholung: [],
        };
        daten.module.push(modul);
        if (!speichern()) {
          daten.module.pop();
          return;
        }
        location.hash = "#/modul/" + modul.id;
      },
    },
    el("label", { for: "neu-name", text: "Name des Moduls" }),
    nameFeld,
    el("label", { for: "neu-datum", text: "Prüfungsdatum" }),
    datumFeld,
    el("button", { type: "submit", class: "knopf", text: "Modul anlegen" })
  );

  return [uebersicht, abschnitt(el("h2", { text: "+ Modul anlegen" }), formular)];
}

// Farbige Countdown-Karte für ein Modul auf der Startseite.
function modulKarte(modul) {
  const countdown = countdownInfo(modul.pruefungsdatum, heuteText());
  const stand = fortschritt(modul);

  const balken = el(
    "div",
    {
      class: "balken",
      role: "progressbar",
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": stand.prozent,
      "aria-label": "Fortschritt " + modul.name,
    },
    el("div", { class: "balken-fuellung", style: "width:" + stand.prozent + "%" })
  );

  return el(
    "a",
    { href: "#/modul/" + modul.id, class: "modul-link countdown-" + countdown.stufe },
    el("span", { class: "modul-name", text: modul.name }),
    el("span", {
      class: "modul-datum",
      text: "Prüfung: " + datumAnzeigen(modul.pruefungsdatum),
    }),
    el("span", { class: "countdown-tage", text: countdown.text }),
    balken,
    el("span", {
      class: "fortschritt-text",
      text:
        stand.gesamt === 0
          ? "Noch keine Themen"
          : stand.erledigt + " von " + stand.gesamt + " Themen erledigt (" + stand.prozent + " %)",
    })
  );
}

// ---------- Modul-Ansicht ----------

function zeigeModul(modul) {
  const teile = [zurueckLink("#/", "Alle Module")];

  teile.push(
    el("h2", { text: modul.name }),
    el("p", { class: "hinweis", text: "Prüfung am " + datumAnzeigen(modul.pruefungsdatum) })
  );

  if (meldung) {
    teile.push(el("p", { class: "erfolg", role: "status", text: meldung }));
    meldung = null;
  }

  teile.push(
    lernplanAbschnitt(modul),
    unterlagenAbschnitt(modul),
    lernenAbschnitt(modul),
    bearbeitenAbschnitt(modul)
  );
  return teile;
}

function lernplanAbschnitt(modul) {
  const themenFeld = el("textarea", {
    id: "themen-neu",
    rows: 5,
    placeholder: "Zum Beispiel:\nZellaufbau\nFotosynthese\nGenetik",
  });

  const hinzufuegenKnopf = el("button", {
    type: "button",
    class: "knopf",
    text: modul.themen.length ? "Themen hinzufügen" : "Plan erstellen",
    onclick: () => {
      const neue = themenFeld.value
        .split(/\r?\n/)
        .map((z) => z.trim())
        .filter(Boolean);
      if (neue.length === 0) {
        alert("Bitte trage mindestens ein Thema ein, eins pro Zeile.");
        return;
      }
      for (const titel of neue) {
        modul.themen.push({ id: neueId(), titel, tag: null, erledigt: false });
      }
      planNeuBerechnen(modul);
      speichern();
      meldung = neue.length + (neue.length === 1 ? " Thema" : " Themen") + " eingeplant.";
      render();
    },
  });

  const knoepfe = [hinzufuegenKnopf];
  if (modul.themen.length > 0) {
    knoepfe.push(
      el("button", {
        type: "button",
        class: "knopf-zweit",
        text: "Plan neu berechnen",
        onclick: () => {
          if (planNeuBerechnen(modul)) {
            meldung = "Die offenen Themen wurden neu auf die restlichen Tage verteilt.";
          }
          speichern();
          render();
        },
      })
    );
  }

  return abschnitt(
    el("h2", { text: "Lernplan" }),
    el("label", { for: "themen-neu", text: "Themen (eins pro Zeile)" }),
    themenFeld,
    el("div", { class: "knopfreihe" }, knoepfe),
    planListe(modul)
  );
}

function planListe(modul) {
  const heute = heuteText();
  const resttage = tageZwischen(heute, modul.pruefungsdatum);
  const teile = [];

  if (resttage <= 0) {
    teile.push(
      el("p", {
        class: "warnung",
        text: "Die Prüfung ist heute oder schon vorbei. Ein Lernplan kann nicht mehr berechnet werden.",
      })
    );
  }

  if (modul.themen.length === 0) {
    teile.push(el("p", { class: "hinweis", text: "Noch keine Themen. Trage oben deine Themen ein." }));
    return el("div", null, teile);
  }

  const veraltet = modul.themen.some((t) => t.tag && t.tag < heute && !t.erledigt);
  if (veraltet && resttage > 0) {
    teile.push(
      el("p", {
        class: "warnung",
        text: "Einige offene Themen liegen in der Vergangenheit. Klicke auf „Plan neu berechnen“.",
      })
    );
  }

  // Themen nach Tag gruppieren
  const gruppen = new Map();
  for (const thema of modul.themen) {
    const tag = thema.tag || "";
    if (!gruppen.has(tag)) gruppen.set(tag, []);
    gruppen.get(tag).push(thema);
  }

  const alleTage = new Set([...gruppen.keys()].filter(Boolean));
  for (const tag of modul.wiederholung) {
    if (tag >= heute) alleTage.add(tag);
  }

  const liste = el("ul", { class: "plan" });
  for (const tag of [...alleTage].sort()) {
    const istHeute = tag === heute;
    const themenAmTag = gruppen.get(tag) || [];
    const klasse = "plantag" + (istHeute ? " heute" : "") + (tag < heute ? " vergangen" : "");
    liste.append(
      el(
        "li",
        { class: klasse },
        el("h3", { text: datumAnzeigen(tag) + (istHeute ? " – heute" : "") }),
        themenAmTag.length
          ? el("ul", { class: "themenliste" }, themenAmTag.map((t) => themaZeile(modul, t)))
          : null,
        modul.wiederholung.includes(tag)
          ? el("p", { text: "Wiederholung: Gehe alle Themen noch einmal durch." })
          : null
      )
    );
  }

  if (gruppen.has("")) {
    liste.append(
      el(
        "li",
        { class: "plantag" },
        el("h3", { text: "Noch nicht eingeplant" }),
        el("ul", { class: "themenliste" }, gruppen.get("").map((t) => themaZeile(modul, t)))
      )
    );
  }

  teile.push(liste);
  return el("div", null, teile);
}

function themaZeile(modul, thema) {
  const feldId = "thema-" + thema.id;
  const zeile = el("li", { class: "thema" + (thema.erledigt ? " erledigt" : "") });
  const haken = el("input", {
    type: "checkbox",
    id: feldId,
    checked: thema.erledigt,
    onchange: () => {
      thema.erledigt = haken.checked;
      speichern();
      zeile.classList.toggle("erledigt", thema.erledigt);
    },
  });
  zeile.append(
    haken,
    el("label", { for: feldId, text: thema.titel }),
    el("button", {
      type: "button",
      class: "knopf-klein",
      "aria-label": "Thema „" + thema.titel + "“ löschen",
      title: "Thema löschen",
      text: "×",
      onclick: () => {
        if (!confirm("Thema „" + thema.titel + "“ löschen?")) return;
        modul.themen = modul.themen.filter((t) => t !== thema);
        speichern();
        render();
      },
    })
  );
  return zeile;
}

function keineKartenHinweis() {
  return el(
    "div",
    { class: "warnung", role: "status" },
    el("p", {
      text: "In diesem Text wurden keine Karteikarten gefunden. Die App erkennt nur diese Muster:",
    }),
    el(
      "ul",
      null,
      el("li", { text: "Begriff: Erklärung (eine Zeile, vor dem Doppelpunkt höchstens 5 Wörter)" }),
      el("li", { text: "Begriff ist / sind … (ein Satz, der mit dem Begriff beginnt)" }),
      el("li", { text: "**Begriff** (fett geschrieben mit zwei Sternchen)" })
    ),
    el("p", { text: "Beispiel:" }),
    el("pre", {
      text:
        "Fotosynthese: Umwandlung von Lichtenergie in chemische Energie.\n" +
        "Mitochondrien sind die Kraftwerke der Zelle.\n" +
        "Die **Zellmembran** umgibt jede Zelle.",
    })
  );
}

function unterlagenAbschnitt(modul) {
  const titelFeld = el("input", { type: "text", id: "unterlage-titel", maxLength: 100 });
  const textFeld = el("textarea", { id: "unterlage-text", rows: 8 });
  const meldungsFeld = el("div", { hidden: true });

  const dateiFeld = el("input", {
    type: "file",
    id: "unterlage-datei",
    accept: ".txt,.md,text/plain,text/markdown",
    onchange: () => {
      const datei = dateiFeld.files[0];
      if (!datei) return;
      if (!/\.(txt|md)$/i.test(datei.name)) {
        alert("Bitte wähle eine .txt- oder .md-Datei aus.");
        dateiFeld.value = "";
        return;
      }
      const leser = new FileReader();
      leser.onload = () => {
        textFeld.value = leser.result;
        if (!titelFeld.value.trim()) {
          titelFeld.value = datei.name.replace(/\.(txt|md)$/i, "");
        }
      };
      leser.onerror = () => alert("Die Datei konnte nicht gelesen werden.");
      leser.readAsText(datei, "UTF-8");
    },
  });

  const speichernKnopf = el("button", {
    type: "button",
    class: "knopf",
    text: "Unterlage speichern",
    onclick: () => {
      const text = textFeld.value.trim();
      if (!text) {
        meldungsFeld.replaceChildren(
          el("p", { class: "warnung", text: "Bitte füge Text ein oder lade eine Datei hoch." })
        );
        meldungsFeld.hidden = false;
        return;
      }
      const karten = kartenErzeugen(text);
      if (karten.length === 0) {
        meldungsFeld.replaceChildren(keineKartenHinweis());
        meldungsFeld.hidden = false;
        return;
      }
      const titel = titelFeld.value.trim() || "Unterlage " + (modul.unterlagen.length + 1);
      modul.unterlagen.push({ id: neueId(), titel, text, karten });
      if (!speichern()) {
        modul.unterlagen.pop();
        return;
      }
      meldung =
        karten.length + (karten.length === 1 ? " Karteikarte" : " Karteikarten") +
        " aus „" + titel + "“ erstellt.";
      render();
    },
  });

  const tipp = el(
    "div",
    { class: "tipp" },
    el("strong", { text: "Tipp: Text aus einer PDF oder einem Foto übernehmen" }),
    el(
      "ul",
      null,
      el("li", {
        text: "PDF: Datei öffnen, Strg + A (alles markieren), Strg + C (kopieren), hier Strg + V (einfügen).",
      }),
      el("li", { text: "iPhone-Foto: Foto öffnen, lange auf den Text drücken, „Kopieren“ wählen." }),
      el("li", { text: "Android-Foto: Foto in Google Fotos öffnen, „Lens“ antippen, Text kopieren." })
    )
  );

  const liste =
    modul.unterlagen.length === 0
      ? el("p", { class: "hinweis", text: "Noch keine Unterlagen." })
      : el(
          "ul",
          { class: "unterlagenliste" },
          modul.unterlagen.map((u) =>
            el(
              "li",
              { class: "unterlage" },
              el("span", { class: "unterlage-titel", text: u.titel }),
              el("span", {
                class: "hinweis",
                text: u.karten.length + (u.karten.length === 1 ? " Karte" : " Karten"),
              }),
              el("button", {
                type: "button",
                class: "knopf-gefahr",
                text: "Löschen",
                onclick: () => {
                  if (!confirm("Unterlage „" + u.titel + "“ mit allen Karten löschen?")) return;
                  modul.unterlagen = modul.unterlagen.filter((x) => x !== u);
                  speichern();
                  render();
                },
              })
            )
          )
        );

  return abschnitt(
    el("h2", { text: "Unterlagen" }),
    liste,
    el("h3", { text: "+ Unterlage hinzufügen", style: "margin-top:16px" }),
    el("label", { for: "unterlage-titel", text: "Titel" }),
    titelFeld,
    el("label", { for: "unterlage-datei", text: "Datei hochladen (.txt oder .md)" }),
    dateiFeld,
    el("label", { for: "unterlage-text", text: "… oder Text hier einfügen" }),
    textFeld,
    tipp,
    meldungsFeld,
    speichernKnopf
  );
}

function lernenAbschnitt(modul) {
  const anzahl = alleKarten(modul).length;
  if (anzahl === 0) {
    return abschnitt(
      el("h2", { text: "Lernen" }),
      el("p", { class: "hinweis", text: "Füge zuerst eine Unterlage hinzu. Daraus entstehen Karteikarten und ein Quiz." })
    );
  }
  return abschnitt(
    el("h2", { text: "Lernen" }),
    el("p", { text: anzahl + (anzahl === 1 ? " Karteikarte" : " Karteikarten") + " in diesem Modul." }),
    el(
      "div",
      { class: "knopfreihe" },
      el("a", { href: "#/modul/" + modul.id + "/karten", class: "knopf", text: "Karteikarten" }),
      el("a", { href: "#/modul/" + modul.id + "/quiz", class: "knopf", text: "Quiz" })
    )
  );
}

function bearbeitenAbschnitt(modul) {
  const nameFeld = el("input", { type: "text", id: "modul-name", required: true, maxLength: 100, value: modul.name });
  const datumFeld = el("input", { type: "date", id: "modul-datum", required: true, value: modul.pruefungsdatum });

  const formular = el(
    "form",
    {
      onsubmit: (e) => {
        e.preventDefault();
        const name = nameFeld.value.trim();
        if (!name || !datumFeld.value) {
          alert("Bitte gib einen Namen und ein Prüfungsdatum ein.");
          return;
        }
        const datumGeaendert = datumFeld.value !== modul.pruefungsdatum;
        modul.name = name;
        modul.pruefungsdatum = datumFeld.value;
        if (datumGeaendert && modul.themen.length > 0) planNeuBerechnen(modul);
        speichern();
        meldung = datumGeaendert && modul.themen.length > 0
          ? "Gespeichert. Der Lernplan wurde an das neue Datum angepasst."
          : "Gespeichert.";
        render();
      },
    },
    el("label", { for: "modul-name", text: "Name" }),
    nameFeld,
    el("label", { for: "modul-datum", text: "Prüfungsdatum" }),
    datumFeld,
    el(
      "div",
      { class: "knopfreihe" },
      el("button", { type: "submit", class: "knopf", text: "Änderungen speichern" }),
      el("button", {
        type: "button",
        class: "knopf-gefahr",
        text: "Modul löschen",
        onclick: () => {
          if (!confirm("Modul „" + modul.name + "“ wirklich löschen? Alle Themen und Unterlagen gehen verloren.")) return;
          daten.module = daten.module.filter((m) => m !== modul);
          speichern();
          location.hash = "#/";
        },
      })
    )
  );

  return abschnitt(el("h2", { text: "Modul bearbeiten" }), formular);
}

// ---------- Karteikarten ----------

function zeigeKarten(modul) {
  const modulLink = "#/modul/" + modul.id;
  const teile = [zurueckLink(modulLink, "Zurück zum Modul"), el("h2", { text: "Karteikarten: " + modul.name })];

  const karten = alleKarten(modul);
  if (karten.length === 0) {
    teile.push(abschnitt(el("p", { text: "Dieses Modul hat noch keine Karteikarten. Füge zuerst eine Unterlage hinzu." })));
    return teile;
  }

  if (!sitzung) {
    sitzung = { stapel: karten.slice(), pos: 0, umgedreht: false, gewusst: 0, gesehen: new Set(), anzahl: karten.length };
  }
  const s = sitzung;

  if (s.pos >= s.stapel.length) {
    teile.push(
      abschnitt(
        el("p", { class: "ergebnis", text: "Geschafft!" }),
        el("p", { text: "Du wusstest " + s.gewusst + " von " + s.anzahl + " Karten beim ersten Versuch." }),
        el(
          "div",
          { class: "knopfreihe" },
          el("button", { type: "button", class: "knopf", text: "Noch einmal", onclick: () => { sitzung = null; render(); } }),
          el("a", { href: modulLink, class: "knopf-zweit", text: "Zurück zum Modul" })
        )
      )
    );
    return teile;
  }

  const karte = s.stapel[s.pos];

  function weiter(gewusst) {
    if (gewusst) {
      if (!s.gesehen.has(karte.id)) s.gewusst++;
    } else {
      s.stapel.push(karte);
    }
    s.gesehen.add(karte.id);
    s.pos++;
    s.umgedreht = false;
    render();
  }

  const kartenKnopf = el(
    "button",
    {
      type: "button",
      class: "karte" + (s.umgedreht ? " rueckseite" : ""),
      "aria-label": (s.umgedreht ? "Rückseite: " + karte.antwort : "Vorderseite: " + karte.frage) + ". Zum Umdrehen klicken.",
      onclick: () => { s.umgedreht = !s.umgedreht; render(); },
    },
    el("span", { class: "karte-seite", text: s.umgedreht ? "Rückseite" : "Vorderseite" }),
    el("span", { text: s.umgedreht ? karte.antwort : karte.frage })
  );

  teile.push(
    el("p", { class: "hinweis", text: "Karte " + (s.pos + 1) + " von " + s.stapel.length }),
    kartenKnopf,
    s.umgedreht
      ? el(
          "div",
          { class: "knopfreihe" },
          el("button", { type: "button", class: "knopf", text: "Wusste ich", onclick: () => weiter(true) }),
          el("button", { type: "button", class: "knopf-zweit", text: "Noch nicht", onclick: () => weiter(false) })
        )
      : el("p", { class: "hinweis", text: "Tippe auf die Karte, um sie umzudrehen." })
  );
  return teile;
}

// ---------- Quiz ----------

function zeigeQuiz(modul) {
  const modulLink = "#/modul/" + modul.id;
  const teile = [zurueckLink(modulLink, "Zurück zum Modul"), el("h2", { text: "Quiz: " + modul.name })];

  if (!sitzung) {
    const fragen = quizErstellen(alleKarten(modul));
    if (!fragen) {
      teile.push(
        abschnitt(
          el("p", {
            class: "warnung",
            text: "Für ein Quiz braucht das Modul mindestens 4 verschiedene Begriffe. Füge weitere Unterlagen hinzu.",
          })
        )
      );
      return teile;
    }
    sitzung = { fragen, pos: 0, punkte: 0, gewaehlt: null };
  }
  const s = sitzung;

  if (s.pos >= s.fragen.length) {
    teile.push(
      abschnitt(
        el("p", { class: "ergebnis", text: s.punkte + " von " + s.fragen.length + " richtig" }),
        el(
          "div",
          { class: "knopfreihe" },
          el("button", { type: "button", class: "knopf", text: "Neues Quiz", onclick: () => { sitzung = null; render(); } }),
          el("a", { href: modulLink, class: "knopf-zweit", text: "Zurück zum Modul" })
        )
      )
    );
    return teile;
  }

  const frage = s.fragen[s.pos];
  const beantwortet = s.gewaehlt !== null;

  const antworten = el(
    "div",
    { class: "antworten" },
    frage.optionen.map((option) => {
      let klasse = "antwort";
      if (beantwortet && option === frage.richtig) klasse += " richtig";
      else if (beantwortet && option === s.gewaehlt) klasse += " falsch";
      return el("button", {
        type: "button",
        class: klasse,
        disabled: beantwortet,
        text: option,
        onclick: () => {
          s.gewaehlt = option;
          if (option === frage.richtig) s.punkte++;
          render();
        },
      });
    })
  );

  const inhalt = [
    el("p", { class: "hinweis", text: "Frage " + (s.pos + 1) + " von " + s.fragen.length }),
    el("p", {
      text: frage.typ === "definition" ? "Welcher Begriff passt zu dieser Erklärung?" : "Welcher Begriff gehört in die Lücke?",
    }),
    el("p", { class: "frage-text", text: frage.text }),
    antworten,
  ];

  if (beantwortet) {
    const richtig = s.gewaehlt === frage.richtig;
    inhalt.push(
      el("p", {
        role: "status",
        class: richtig ? "erfolg" : "warnung",
        style: "margin:12px 0 0",
        text: richtig ? "Richtig!" : "Leider falsch. Richtig ist: " + frage.richtig,
      }),
      el("button", {
        type: "button",
        class: "knopf",
        text: s.pos + 1 < s.fragen.length ? "Weiter" : "Ergebnis anzeigen",
        onclick: () => {
          s.pos++;
          s.gewaehlt = null;
          render();
        },
      })
    );
  }

  teile.push(abschnitt(inhalt));
  return teile;
}

/* =========================================================
   Seitenwechsel über die Adresse (#/...)
   ========================================================= */

function render() {
  const app = document.getElementById("app");
  const teile = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const route = teile.join("/");

  if (route !== aktuelleRoute) {
    sitzung = null;
    aktuelleRoute = route;
    window.scrollTo(0, 0);
  }

  let inhalt;
  if (teile[0] === "modul" && teile[1]) {
    const modul = daten.module.find((m) => m.id === teile[1]);
    if (!modul) {
      inhalt = [abschnitt(el("p", { text: "Dieses Modul gibt es nicht (mehr)." }), el("a", { href: "#/", text: "Zur Startseite" }))];
    } else if (teile[2] === "karten") {
      inhalt = zeigeKarten(modul);
    } else if (teile[2] === "quiz") {
      inhalt = zeigeQuiz(modul);
    } else {
      inhalt = zeigeModul(modul);
    }
  } else {
    inhalt = zeigeStart();
  }

  app.replaceChildren(...inhalt);
}

/* =========================================================
   Start
   ========================================================= */

if (typeof document !== "undefined") {
  daten = laden();
  window.addEventListener("hashchange", render);
  render();
}

// Nur für Tests mit Node, im Browser ohne Wirkung.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    planBerechnen,
    kartenErzeugen,
    quizErstellen,
    countdownInfo,
    fortschritt,
    tageZwischen,
    tagPlus,
    heuteText,
  };
}
