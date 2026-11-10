# minverse.pl launcher

Niezależny launcher Minecraft Java dla Windows 11 x64. Oryginalny ciemny interfejs inspirowany starszymi launcherami społecznościowymi; bez kopiowania znaków ani zasobów Feather Client.

## Funkcje

- Oficjalny katalog wydań Mojang: release, snapshot, old alpha i old beta. Lista jest pobierana dynamicznie; zgodność każdej historycznej wersji wymaga osobnego testu.
- Logowanie Microsoft przez kod urządzenia w przeglądarce; wymagane konto posiadające Minecraft Java. Odświeżanie sesji i szyfrowanie cache tokenów systemowym magazynem Electron (DPAPI na Windows).
- Tryb offline z nickiem i poprawnym UUID OfflinePlayer. Nie zapewnia dostępu do usług ani serwerów wymagających uwierzytelnienia Microsoft. Pobieranie brakujących plików nadal wymaga internetu.
- Pobieranie gry, bibliotek i zasobów przez minecraft-launcher-core, wybór Java, RAM, folderu gry oraz postęp pobierania.
- Mały Instalator.exe pobiera Launcher.exe z ostatniego wydania tego repozytorium, sprawdza SHA256 i instaluje dla bieżącego użytkownika ze skrótami oraz deinstalatorem.

## Uruchomienie developerskie

Node.js 24, Windows 11 x64 oraz Java 64-bit. `npm ci`, `npm test`, `npm start`. Na Linuksie Electron wymaga sesji graficznej i bibliotek systemowych. Korzystaj z istniejącego checkoutu; zadania chmurowe są już izolowane, nie twórz dodatkowego worktree.

W ustawieniach launchera wskaż `javaw.exe` właściwe dla wersji gry. Typowo: Java 8 dla starszych wersji, 16 dla 1.17, 17 dla 1.18–1.20.4, 21 od 1.20.5; nowsze wydania mogą wymagać nowszej Java. Wymaganie jest odczytywane z metadanych Mojang. Launcher nie instaluje Java automatycznie. Dostępny jest przycisk do oficjalnej strony Eclipse Temurin.

Pliki gry i konto znajdują się w `%APPDATA%/minverse-launcher/`. Deinstalator zachowuje światy i ustawienia. Wylogowanie usuwa lokalne tokeny; cofnięcie zgody aplikacji jest osobną czynnością w ustawieniach konta Microsoft.

## Kompilacja i dystrybucja

```
npm ci
npm test
npm run build:win
npm run build:installer
npm run release:hash
```

Wynik: `dist/Launcher.exe`, `dist/Instalator.exe`, `dist/Launcher.exe.sha256`. Electron Builder dostarcza NSIS; alternatywnie zainstaluj NSIS 3 i dodaj makensis do PATH. Kompilacja na Linuksie wymaga ustawienia zapisywalnego `ELECTRON_BUILDER_CACHE` i `ELECTRON_CACHE`.

Przed dystrybucją opublikuj te trzy pliki w **jednym, publicznie dostępnym GitHub Release** `ignacy12tul-byte/launcher`. Bez tego instalator poprawnie przerwie pobieranie. Adres repozytorium jest zapisany w `installer/download.ps1`; przy forku zmień go przed kompilacją. Samo skopiowanie instalatora nie publikuje launchera.

Workflow GitHub Actions buduje artefakty przy ręcznym uruchomieniu, a po wysłaniu taga `v1.0.0` dodatkowo tworzy wydanie. Wysyłanie kodu, taga i publikacja wymagają dostępu do repozytorium. Repozytorium nie zawiera kluczy podpisu kodu. Pliki EXE są niepodpisane; Windows może wyświetlić SmartScreen. Do publicznej dystrybucji zalecany podpis Authenticode.

## Weryfikacja na Windows przed wydaniem

1. Uruchom launcher na Windows 11 x64, zaloguj konto z Minecraft Java i sprawdź wylogowanie oraz ponowne logowanie.
2. Uruchom np. 1.8.9 z Java 8 i 1.21.1 z Java 21. Sprawdź pobieranie zasobów, świat lokalny i ponowne uruchomienie.
3. Sprawdź konto offline w świecie lokalnym oraz odmowę dostępu do serwera wymagającego Microsoft.
4. Po publikacji plików uruchom Instalator.exe na czystym Windows, sprawdź pobranie, skróty i deinstalację. Sprawdź przerwane pobranie oraz błędny SHA256 (muszą zatrzymać instalację).

Testy jednostkowe nie potwierdzają logowania Microsoft, działania wszystkich wersji gry ani instalacji Windows. Nie ma automatycznej aktualizacji już zainstalowanego launchera; ponowne uruchomienie instalatora pobiera ostatnie wydanie.

Test interfejsu z atrapą backendu: `node test/ui-smoke.cjs` (Chromium w `/usr/bin/chromium` lub zmienna `CHROME_PATH`). Sprawdza filtrowanie wersji, formularz offline, RAM/Java, żądanie uruchomienia oraz logowanie/wylogowanie w UI. Nie łączy się z Microsoft ani nie uruchamia Minecraft. Audyt zależności runtime: `npm audit --omit=dev`. Utrzymywane zamienniki request, adm-zip i uuid są przypięte przez `overrides`.

Logowanie używa dokumentowanego przepływu device-code biblioteki prismarine-auth (`live`, tytuł Minecraft Nintendo Switch). W zgodzie Microsoft może pojawić się ta nazwa. Launcher nie prosi o hasło i nie przechwytuje go; autoryzacja odbywa się w przeglądarce Microsoft.

## Sieć

Runtime wymaga domen Microsoft/Xbox/Minecraft używanych przez prismarine-auth, `piston-meta.mojang.com`, `piston-data.mojang.com`, `launchermeta.mojang.com`, `launcher.mojang.com`, `libraries.minecraft.net`, `resources.download.minecraft.net` oraz hostów podanych w oficjalnych metadanych. Instalator wymaga `api.github.com`, `github.com` i domen CDN przekierowań GitHub Releases. Nie wyłączaj weryfikacji TLS ani sum kontrolnych.

Projekt nie jest oficjalnym produktem Mojang, Microsoft ani Feather. Prawa do Minecraft należą do ich właścicieli.
