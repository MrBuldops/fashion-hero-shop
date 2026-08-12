# Feature: Wizard of Oz — AI Growth Partner Agent

> Test założenia `at-x-1` z OST projektu FashionHero (Stream B, szansa OPP-8,
> rozwiązanie sol-x). Buduje w tym repo na branchu `feat/woz-agent-test`.
> Kanoniczna kopia planistyczna: vault `3-Projects/fashion-hero/prototypes/`.

OPPORTUNITY: Seller nie ma dedykowanego wsparcia które aktywnie monitoruje jego wyniki
i inicjuje kontakt zanim pojawi się problem.

OUTCOME: >40% sellerów w teście wykonuje ≥1 rekomendację agenta tygodniowo
i >70% wraca aktywnie w tygodniu 4.

## Co budujemy
Prosty czat wbudowany w panel sprzedawcy. Sprzedawca wymienia wiadomości z „agentem",
którym za kurtyną jest człowiek-analityk (Wizard of Oz). Po każdej odpowiedzi agenta
sprzedawca wypełnia krótką ankietę o użyteczności rekomendacji.

## User flow
1. Sprzedawca widzi w panelu przycisk „Chat z agentem partnerem"
2. Po kliknięciu widzi okno czatu
3. System odpowiada hardcodowanym powitaniem
4. Sprzedawca zadaje pytanie
5. System odpowiada podziękowaniem i informacją, że wróci z odpowiedzią
6. Zapytanie trafia do skrzynki analityka (strona `/inbox` w apce)
7. Analityk wpisuje odpowiedź w `/inbox`
8. Sprzedawca widzi odpowiedź w czacie
9. Pod odpowiedzią pojawia się ankieta o użyteczności

## Kryteria akceptacji
- Wiadomość z czatu pojawia się w skrzynce analityka w ciągu 60s
- Odpowiedź analityka pojawia się w czacie sprzedawcy w ciągu 60s
- Po każdej odpowiedzi analityka ankieta (2 pytania tak/nie) pojawia się automatycznie
- Ankieta nie pojawia się, jeśli analityk jeszcze nie odpowiedział

## Czego NIE budujemy
- AI, które samo konwersuje w czacie
- Płynnej konwersacji / pamięci konwersacji
- Prawdziwego SMTP/maila (skrzynka to strona `/inbox` w apce)
- Auth/logowania, bazy danych, websocketów

## Implementacja (skrót)
- Współdzielony store: plik `.data/agent-conversations.json` (gitignored) przez `src/lib/agent-store.ts`
- API: `src/app/api/agent/messages/route.ts` (GET/POST), `src/app/api/agent/survey/route.ts` (POST)
- Panel sprzedawcy: `/seller/[slug]` + komponent `src/components/agent/agent-chat.tsx`
- Skrzynka analityka: `/inbox`
- Obie strony odpytują API co 4s (spełnia kryterium „60s")

## Przykład
```
System:      Witam, jestem partnerskim agentem wspierającym sprzedawców.
             Zadaj mi pytanie dotyczące sprzedaży.
Sprzedawca:  Jak mogę zwiększyć sprzedaż koszulek, które wystawiłem?
System:      Dziękuję, wrócę z odpowiedzią.
(analityk w /inbox pisze: „zwiększ nakłady na reklamę")
Agent:       zwiększ nakłady na reklamę
[Ankieta]    Czy odpowiedź była pomocna? tak/nie
             Czy zaimplementujesz tę radę? tak/nie
```
