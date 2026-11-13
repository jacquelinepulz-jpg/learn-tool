# SPEC: Lern-App für Studierende

## 1. Zweck

Die App hilft Studierenden, sich auf ihre Prüfungen vorzubereiten. Sie macht zwei Dinge:

1. **Lernstoff einteilen:** Für jedes Modul verteilt die App die Themen auf die Tage bis zur Prüfung.
2. **Lernen mit den eigenen Unterlagen:** Aus dem Text der Vorlesungsunterlagen erstellt die App automatisch Karteikarten und ein Quiz.

## 2. Nutzer

- Studierende, die mehrere Prüfungen in verschiedenen Modulen haben.
- Sie benutzen die App am Handy oder am PC.
- Sie brauchen kein technisches Wissen. Die App funktioniert ohne Konto und ohne Anmeldung.

## 3. Funktion

### Muss

**Module und Prüfungen**
- Ein Modul anlegen mit Name und Prüfungsdatum.
- Ein Modul bearbeiten und löschen. Vor dem Löschen fragt die App nach.

**Lernplan**
- Für ein Modul eine Themenliste eingeben, ein Thema pro Zeile.
- Die App verteilt die Themen gleichmäßig auf die Tage von heute bis zum Tag vor der Prüfung.
- Die letzten Tage vor der Prüfung sind für die Wiederholung reserviert: 1 Tag, wenn es bis zu 7 Lerntage gibt, sonst 2 Tage.
- Wenn es mehr Themen als Tage gibt, bekommt ein Tag mehrere Themen.
- Wenn die Prüfung heute oder schon vorbei ist, zeigt die App einen Hinweis statt eines Plans.
- Themen kann man als erledigt abhaken.
- Den Plan kann man neu berechnen lassen. Dabei werden nur die noch offenen Themen auf die restlichen Tage verteilt.

**Unterlagen**
- Zu einem Modul eine Unterlage hinzufügen:
  - als Datei (.txt oder .md) hochladen, oder
  - Text in ein Textfeld einfügen.
- Die Unterlage bekommt einen Titel. Sie kann auch wieder gelöscht werden.
- Beim Textfeld steht ein kurzer Hinweis, wie man Text aus einer PDF oder einem Foto kopiert:
  - PDF: Datei öffnen, Strg + A (alles markieren), Strg + C (kopieren), in der App Strg + V (einfügen).
  - iPhone-Foto: Foto öffnen, lange auf den Text drücken, „Kopieren“ wählen.
  - Android-Foto: Foto in Google Fotos öffnen, „Lens“ antippen, Text kopieren.

**Automatische Karteikarten (ohne KI)**
- Die App sucht im Text nach diesen Mustern:
  1. **Begriff: Erklärung**, also eine Zeile, in der vor dem Doppelpunkt höchstens 5 Wörter stehen. Die Vorderseite zeigt den Begriff, die Rückseite die Erklärung.
  2. **Begriff ist/sind …**, also ein Satz, der mit einem Begriff aus höchstens 5 Wörtern beginnt, gefolgt von „ist“ oder „sind“. Die Vorderseite zeigt den Satz mit Lücke statt des Begriffs, die Rückseite den Begriff.
  3. **\*\*Fettgedruckter Begriff\*\*** (Markdown). Die Vorderseite zeigt den Satz mit Lücke statt des Begriffs, die Rückseite den Begriff.
- Doppelte Karten werden nicht angelegt.
- Findet die App keine Karten, zeigt sie einen Hinweis mit einem Beispiel, wie der Text aussehen sollte.

**Karteikarten lernen**
- Die Karten eines Moduls werden nacheinander gezeigt.
- Ein Klick auf die Karte dreht sie um.
- Danach wählt man „Wusste ich“ oder „Noch nicht“.
- Karten mit „Noch nicht“ kommen am Ende der Runde noch einmal.
- Am Ende zeigt die App, wie viele Karten man wusste.

**Quiz (Multiple Choice)**
- Pro Frage gibt es einen Satz mit Lücke und 4 Antworten.
- Die 3 falschen Antworten nimmt die App aus anderen Begriffen desselben Moduls.
- Ein Quiz ist nur möglich, wenn es im Modul mindestens 4 verschiedene Begriffe gibt. Sonst zeigt die App einen Hinweis.
- Nach dem Klick auf eine Antwort sieht man sofort, ob sie richtig war. Die richtige Antwort wird grün markiert.
- Ein Quiz hat höchstens 10 Fragen in zufälliger Reihenfolge.
- Am Ende sieht man die Punktzahl, zum Beispiel „7 von 10 richtig“.

**Speichern**
- Alle Daten werden automatisch im Browser gespeichert.
- Nach dem Neuladen der Seite sind alle Daten noch da.

### Soll (die zwei sichtbaren Highlights)

1. **Prüfungs-Countdown auf der Startseite**
   - Jedes Modul ist eine farbige Karte mit Name, Prüfungsdatum und groß „noch X Tage“.
   - Ein Fortschrittsbalken zeigt, wie viele Themen erledigt sind.
   - Die Farbe zeigt, wie nah die Prüfung ist: grün ab 15 Tagen, gelb bei 7 bis 14 Tagen, rot bei unter 7 Tagen.
   - Die Karten sind nach Prüfungsdatum sortiert, die nächste Prüfung steht zuerst.
2. **Umdrehbare Karteikarten**
   - Die Karte dreht sich beim Klick mit einer 3D-Animation um.
   - Vorder- und Rückseite sind farblich klar unterscheidbar.

### Bewusst nicht

- Keine KI und keine automatisch „schlauen“ Fragen. Die Fragen entstehen nur nach den festen Mustern oben.
- Kein Hochladen von PDF-, Word- oder PowerPoint-Dateien. Stattdessen gibt es den Hinweis zum Kopieren von Text aus PDFs.
- Keine Texterkennung in Fotos und keine Bilder auf Karteikarten. Stattdessen gibt es den Hinweis zum Kopieren von Text aus Fotos.
- Keine Konten, keine Anmeldung, kein Server.
- Kein Abgleich zwischen Geräten und kein Export oder Import.
- Keine Erinnerungen oder Benachrichtigungen.
- Kein Bearbeiten einzelner Karteikarten (nur Unterlage löschen und neu anlegen).
- Kein Lernsystem mit Wiederholungsabständen über mehrere Tage (Spaced Repetition).

## 4. Daten

Alles liegt im `localStorage` des Browsers unter einem einzigen Schlüssel als JSON.

```
module: [
  {
    id, name, pruefungsdatum (JJJJ-MM-TT),
    themen: [ { id, titel, tag (JJJJ-MM-TT oder "wiederholung"), erledigt (ja/nein) } ],
    unterlagen: [
      { id, titel, text,
        karten: [ { id, frage, antwort } ] }
    ]
  }
]
```

- Die Karten werden beim Anlegen der Unterlage einmal erzeugt und mitgespeichert.
- Der Lernfortschritt bei Karteikarten und Quiz wird nicht dauerhaft gespeichert, nur während der Runde.

## 5. Oberfläche

Eine einzige Seite mit mehreren Ansichten. Oben steht immer eine Leiste mit dem App-Namen und einem Knopf „Zur Startseite“.

1. **Startseite:** Countdown-Karten aller Module (Highlight 1) und der Knopf „+ Modul anlegen“. Gibt es noch keine Module, steht dort ein kurzer Willkommenstext.
2. **Modul-Ansicht:** zeigt Name und Datum (bearbeitbar) und hat drei Bereiche:
   - **Lernplan:** Themen eingeben, Plan als Liste nach Tagen, Häkchen zum Abhaken, heutiger Tag hervorgehoben.
   - **Unterlagen:** Liste der Unterlagen mit Anzahl der Karten, Knopf „+ Unterlage“.
   - **Lernen:** die Knöpfe „Karteikarten“ und „Quiz“.
3. **Karteikarten-Ansicht:** große Karte in der Mitte (Highlight 2), darunter die zwei Knöpfe und „Karte 3 von 12“.
4. **Quiz-Ansicht:** Frage oben, 4 Antwort-Knöpfe untereinander, „Frage 2 von 10“, am Ende das Ergebnis.

Gestaltung:
- Die Seite funktioniert auf dem Handy (ab 360 px Breite) und auf dem PC.
- Die Knöpfe sind groß genug für Finger.
- Gut lesbare Schrift mit genug Kontrast.
- Die ganze Oberfläche ist auf Deutsch.

## 6. Technik und Grenzen

**Technik**
- Nur HTML, CSS und JavaScript. Keine externen Bibliotheken, keine Schriften oder Dateien aus dem Internet.
- Drei Dateien: `index.html`, `style.css`, `app.js`.
- Die App funktioniert durch einen Doppelklick auf `index.html`, ganz ohne Server.
- Dateien werden mit dem `FileReader` des Browsers eingelesen.
- Keine Passwörter oder Schlüssel in Dateien.

**Grenzen**
- Die Qualität der Karten hängt davon ab, wie der Text aufgebaut ist. Fließtext ohne Definitionen ergibt wenige oder keine Karten.
- Der Browser-Speicher fasst etwa 5 MB. Sehr viele oder sehr lange Unterlagen passen nicht hinein. Wenn das Speichern fehlschlägt, zeigt die App eine Meldung.
- Wer die Browserdaten löscht oder einen anderen Browser oder ein anderes Gerät benutzt, sieht seine Daten nicht mehr.
- Die App muss in einer Runde baubar sein. Alles, was über diese SPEC hinausgeht, kommt später.

## 7. Abnahmekriterien

Die App gilt als fertig, wenn alle Punkte erfüllt sind:

1. Ein Doppelklick auf `index.html` öffnet die App im Browser, ohne Fehler in der Konsole.
2. Ich kann ein Modul „Mathe 1“ mit einem Prüfungsdatum in 20 Tagen anlegen. Auf der Startseite erscheint eine grüne Karte mit „noch 20 Tage“.
3. Ein Modul mit Prüfung in 5 Tagen erscheint rot und steht vor „Mathe 1“.
4. Ich gebe 10 Themen ein. Die App verteilt sie auf die Tage bis zur Prüfung und reserviert die letzten 2 Tage zur Wiederholung.
5. Ich hake 5 von 10 Themen ab. Der Fortschrittsbalken auf der Startseite steht bei 50 %.
6. Nach dem Neuladen der Seite sind Module, Themen, Häkchen und Unterlagen noch da.
7. Ich füge diesen Text als Unterlage ein:
   ```
   Fotosynthese: Umwandlung von Lichtenergie in chemische Energie.
   Mitochondrien sind die Kraftwerke der Zelle.
   Die **Zellmembran** umgibt jede Zelle.
   Ribosomen: Orte der Proteinsynthese.
   ```
   Die App erstellt daraus 4 Karteikarten.
8. Ich lade eine .txt-Datei hoch. Ihr Inhalt wird als Unterlage übernommen.
   Beim Textfeld sehe ich den Hinweis, wie man Text aus einer PDF und aus einem Foto (iPhone und Android) kopiert.
9. Ein Klick auf eine Karteikarte dreht sie sichtbar mit einer Animation um.
10. Eine Karte mit „Noch nicht“ erscheint in derselben Runde noch einmal.
11. Mit den 4 Karten aus Punkt 7 kann ich ein Quiz starten. Jede Frage hat 4 verschiedene Antworten, genau eine davon ist richtig.
12. Am Ende des Quiz sehe ich meine Punktzahl.
13. Bei einer Unterlage ohne passende Muster erscheint ein verständlicher Hinweis statt eines Fehlers.
14. Bei einer Breite von 360 px gibt es keinen waagerechten Scrollbalken und alle Knöpfe sind bedienbar.
15. Der Code verwendet keine externe Bibliothek und enthält keine Passwörter oder Schlüssel.
