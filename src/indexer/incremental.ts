/**
 * PHASE 6 – Inkrementelles Indexieren (baust du selbst)
 *
 * Aktuell löscht `indexProject` bei jedem Lauf alles und baut neu auf.
 * Bei 50 Files egal, bei 5000 nicht mehr.
 *
 * Idee:
 *   1. Für jede Datei auf der Platte mtime vergleichen mit der Tabelle `files`
 *   2. mtime anders -> Hash berechnen und vergleichen (mtime ändert sich auch beim git checkout)
 *   3. Geänderte + gelöschte Files: Zeile in `files` löschen
 *      -> ON DELETE CASCADE räumt nodes und deren edges automatisch mit ab
 *   4. Geänderte + neue Files neu indexieren
 *
 * Die Falle: Kanten, die von UNVERÄNDERTEN Files auf ein geändertes File zeigen,
 * werden durch die Cascade auch gelöscht. Die musst du neu schreiben.
 * Lösung: vor dem Löschen die Quell-Files dieser Kanten merken und mit-neu-indexieren.
 *
 * Danach: Git-Hook (post-commit, post-checkout, post-merge) ruft `lunagraph index` auf.
 */
export {};
