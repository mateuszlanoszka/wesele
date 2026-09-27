# 🍋 Nasz Dzień – Aplikacja Weselna Moniki i Mateusza

Progresywna aplikacja webowa (PWA) na wesele w motywie sycylijskim, **26 czerwca 2027, 17:00**.
Odciąża Parę Młodą w sprawach logistycznych (plan dnia, menu, stoliki, dojazd) i integruje gości przez wspólną, żywą galerię zdjęć oraz zamówienia piosenek do DJ-a.

---

## 📁 Struktura plików

```
/
├── index.html          ← cała aplikacja (UI, dane wesela, logika)
├── sw.js               ← Service Worker (działanie offline, cache)
├── manifest.json       ← konfiguracja PWA (instalacja na ekranie głównym)
├── icons/              ← ikony PWA (tymczasowe – do podmiany na docelowe)
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png
│   └── favicon-48.png
├── assets/             ← własne zdjęcia tła (opcjonalne)
│   ├── hero-dzien.jpg  ← tryb jasny (cytryny)
│   └── hero-noc.jpg    ← tryb ciemny (Palermo nocą)
└── Code.gs             ← backend – wklejany do Google Apps Script (NIE na hosting)
```

> Brak plików w `assets/` niczego nie psuje – wyświetli się gradient w kolorach motywu.

---

## 🏛️ Architektura

Aplikacja działa bez własnego serwera, na ekosystemie **Google Workspace** i statycznym hostingu.

### Frontend (`index.html`)
* **Dane osadzone w kodzie** – plan dnia, menu z alergenami, drinki, fiszki, lista stołów i informacje praktyczne są w obiekcie `weddingData`. Ładują się natychmiast, także bez zasięgu. **Arkusz Google nie przechowuje tych danych.**
* **Offline-first (Service Worker)** – po pierwszym otwarciu aplikacja (razem z czcionkami) jest zapisana w telefonie i uruchamia się bez sieci.
* **Kolejka offline (IndexedDB)** – zdjęcia i piosenki wysłane bez zasięgu czekają w telefonie i wysyłają się same, gdy wróci sieć (sprawdzane co 30 s, przy powrocie do aplikacji i po odzyskaniu połączenia). Na górze ekranu widać licznik „Czeka na zasięg”.
* **Kompresja zdjęć w przeglądarce** – pełny obraz (dłuższy bok max 1920 px, JPEG 80%) trafia na Dysk, a miniatura 240×320 px (max ~40 tys. znaków base64) do arkusza.
* **Wysyłka wielu zdjęć naraz** – do 10 zdjęć z galerii telefonu, z postępem „(2/5)”.
* **Zapamiętanie gościa** – imię wpisane raz uzupełnia się w formularzu zdjęć i piosenek.
* **Znajdź swój stolik** – wyszukiwanie po imieniu/nazwisku, bez polskich znaków i wielkości liter („kowalska” = „Kowalska”, „lukasz” = „Łukasz”). Pokazuje stół i osoby przy nim.
* **Tryb jasny/ciemny** – domyślnie zgodny z ustawieniem telefonu, wybór gościa jest zapamiętywany.
* **Usuwanie własnego zdjęcia** – przez 10 minut od wysłania, zabezpieczone tokenem po stronie serwera.

### Backend (`Code.gs` – Google Apps Script)
Przyjmuje zapytania POST (`Content-Type: text/plain`, dzięki czemu przeglądarka nie wysyła zapytania wstępnego CORS):

| Akcja | Co robi |
|---|---|
| `uploadPhoto` | zapisuje JPEG na Dysku, udostępnia „każdemu z linkiem”, dopisuje wiersz z miniaturą i tokenem usuwania |
| `getGallery` | zwraca 60 najnowszych zdjęć; jeśli nic się nie zmieniło – tylko `unchanged: true` (oszczędza transfer) |
| `deletePhoto` | usuwa zdjęcie tylko przy zgodnym tokenie, w ciągu 12 min, i tylko z folderu weselnego |
| `addSong` | dopisuje zamówienie piosenki |

Otwarcie adresu `/exec` w przeglądarce (GET) zwraca `{"status":"ok"}` – szybki test, czy API działa.

### Zasoby Google
* **Arkusz:** `1-zRyORjcI2NJvkRKksEjQC470aWmtxFHrmzyRmemlT4`
* **Folder na Dysku:** `1hGfqhSUojD0XWqpkd0SQZUCnFXhPHIoH`

---

## 🔒 Bezpieczeństwo i niezawodność

* **Usuwanie zdjęć:** przy wysyłce serwer generuje losowy token, który zna tylko telefon autora. Bez tokenu, po czasie lub dla pliku spoza galerii serwer odmawia. (Wcześniejsza wersja pozwalała przenieść do kosza dowolny plik z Dysku właściciela skryptu.)
* **XSS:** wszystkie teksty od gości (autor, podpis) są escapowane przed wyświetleniem.
* **Wstrzykiwanie formuł:** wpisy zaczynające się od `= + - @` są zapisywane w arkuszu jako tekst.
* **Duplikaty:** każde zdjęcie i piosenka ma `clientId` – ponowienie wysyłki z kolejki offline nie tworzy duplikatu.
* **Współbieżność:** zapisy do arkusza chroni `LockService`; upload na Dysk odbywa się poza blokadą, żeby goście nie czekali na siebie nawzajem.
* **Brak „sierot”:** jeśli zapis do arkusza się nie uda, plik na Dysku trafia do kosza.
* **Limit komórki Sheets (50 000 znaków):** miniatura jest pilnowana po obu stronach; w razie przekroczenia galeria pokazuje miniaturę z Dysku.

> ⚠️ **Prywatność:** lista gości przy stołach jest częścią publicznego pliku `index.html`. Link zna każdy, kto zeskanuje QR. Jeśli to problem – zamiast pełnych nazwisk użyjcie formy „Anna K.”.

---

## 🗄️ Struktura Arkusza Google

Tylko dwie zakładki. Najprościej: w edytorze Apps Script uruchom funkcję **`przygotujArkusz()`** – utworzy zakładki i nagłówki (istniejących danych nie rusza).

1. **Wasze_Kadry**: `Data` | `Autor` | `Podpis` | `ID Pliku` | `Link do dysku` | `Miniaturka` | `Token usuwania` | `ID klienta`
2. **Piosenki**: `Data` | `Kto zamawia` | `Tytuł` | `Dedykacja` | `Disco polo` | `Zagrane` | `ID klienta`

Kolumna `Zagrane` (checkbox) jest dla DJ-a. Zdjęcia dodane przed tą wersją (bez tokenu) nie mogą być usuwane przez gości.

---

## ✏️ Edycja treści

Wszystkie treści są w `index.html`, w obiekcie `weddingData` (sekcja oznaczona „DANE WESELA”):

* `planDnia`, `drinki`, `fiszki` – bez zmian w formacie.
* `kartaDan` – dodatkowo `Alergeny: ["gluten", "mleko", ...]` i `Wege: true/false`. **Alergeny są wstępne – potwierdźcie je z kuchnią.**
* `stoly` – `{ Stół: "Catania", Goście: ["Anna Kowalska", ...] }`. **Obecne nazwiska są przykładowe.**
* `informacje` – `Ikona` (nazwa z [Material Icons](https://fonts.google.com/icons)), `Tytuł`, `Opis`, opcjonalnie `Link` (`https://…` lub `tel:…`) i `LinkTekst`. Uzupełnijcie pola `[UZUPEŁNIJ]`.

> 🔁 **Po każdej zmianie `index.html` podbij `VERSION` w `sw.js`** (np. `v1.0.0` → `v1.0.1`). Bez tego telefony gości, które już otwierały aplikację, pokażą starą wersję.

---

## 🚀 Wdrożenie krok po kroku

### 1. Backend (Apps Script)
1. Otwórz [script.google.com](https://script.google.com), wklej zawartość `Code.gs`.
2. Uruchom `autoryzuj()` i zaakceptuj uprawnienia, potem `przygotujArkusz()`.
3. **Wdróż → Nowe wdrożenie → Aplikacja internetowa**: *Wykonaj jako: Ja*, *Kto ma dostęp: Każdy*.
4. Skopiuj adres `/exec` do stałej `API_URL` w `index.html`.
5. Przy każdej zmianie kodu: **Wdróż → Zarządzaj wdrożeniami → ołówek → Wersja: Nowa wersja**. Adres `/exec` pozostaje ten sam. (Nowe wdrożenie = nowy adres = trzeba zmienić `API_URL`.)

### 2. Hosting (GitHub Pages)
1. Wrzuć do repozytorium: `index.html`, `sw.js`, `manifest.json`, `icons/`, `assets/` (bez `Code.gs`).
2. **Settings → Pages → Deploy from branch → main / root**.
3. Adres: `https://<użytkownik>.github.io/<repozytorium>/`. Wszystkie ścieżki są względne, więc działa też w podkatalogu. Service Worker wymaga HTTPS – GitHub Pages, Vercel i Netlify go zapewniają.

### 3. Materiały drukowane
Kod QR na docelowy adres – na winietkach, w menu i przy barze. Warto dodać podpis „Otwórz przed wyjazdem na salę – zadziała bez zasięgu”.

---

## ✅ Status projektu

* [x] Arkusz i folder na Dysku, wymuszona autoryzacja (`DriveApp`)
* [x] UI: motyw sycylijski, glassmorphism, tryb dzień/noc (zapamiętywany, zgodny z telefonem)
* [x] Dane statyczne osadzone w HTML
* [x] Galeria: podwójna kompresja, wysyłka wielu zdjęć, miniatury w limicie Sheets, pobieranie tylko przy zmianach
* [x] Piosenki z flagą charytatywną (Disco Polo)
* [x] Bezpieczne usuwanie własnych zdjęć (token, 10 min)
* [x] Ochrona przed XSS i wstrzykiwaniem formuł, blokady zapisu, idempotencja
* [x] Kolejka offline dla zdjęć i piosenek
* [x] Znajdź swój stolik, informacje praktyczne, alergeny w menu
* [x] Manifest PWA, ikony (tymczasowe), Service Worker, przycisk instalacji (Android)

## 📋 Przed weselem – lista kontrolna

1. [ ] Podmienić przykładowe nazwiska w `stoly` na listę gości.
2. [ ] Uzupełnić `informacje` (sala, parking, nocleg, taxi, dress code).
3. [ ] Potwierdzić alergeny i dania wege z kuchnią.
4. [ ] Dodać własne zdjęcia `assets/hero-dzien.jpg` i `assets/hero-noc.jpg` (poziome, ~1600 px, < 300 KB). Poprzednie tła z iStock (podgląd ze znakiem wodnym, licencja) i visititaly.eu (hotlink) zostały usunięte.
5. [ ] Podmienić ikony w `icons/` na docelowe (np. monogram z zaproszeń).
6. [ ] Wdrożyć nową wersję `Code.gs` i uruchomić `przygotujArkusz()`.
7. [ ] Sprawdzić, czy link do zdjęcia otwiera się na telefonie **bez zalogowania** do konta Google (tryb incognito).
8. [ ] Test na iPhonie (Safari) i Androidzie (Chrome): zdjęcie z aparatu, 5 zdjęć z galerii, piosenka w trybie samolotowym → wyłączenie trybu → automatyczna wysyłka.
9. [ ] Test obciążenia: kilka telefonów wysyła zdjęcia jednocześnie.
10. [ ] Poinformować DJ-a o arkuszu `Piosenki` i kolumnie `Zagrane`.

## 💡 Pomysły na kolejne wersje

* Tryb pokazu slajdów na rzutnik/TV z automatycznym odświeżaniem galerii.
* Status „Zagrane” widoczny dla gości przy ich zamówieniach.
* Księga życzeń (tekst lub krótkie nagranie głosowe).
* Wyróżnienie w planie dnia punktu „Teraz trwa”.
* Numer BLIK / link do wpłaty na schronisko bezpośrednio w ostrzeżeniu Disco Polo.
* Po weselu: link do pobrania wszystkich zdjęć (folder na Dysku) jako podziękowanie dla gości.
