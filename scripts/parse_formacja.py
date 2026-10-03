r"""Generuje src/data/formacjaContent.json z zeszytów Formacji (.doc).

1. Konwersja .doc -> .txt (UTF-8) przez Worda (PowerShell, Windows), np. do
   katalogu C:\tmp\txt - nazwa pliku to ścieżka z "_" zamiast "\" i spacji
   ("formacja 3rok\kosciol\01_X.doc" -> "formacja_3rok_kosciol_01_X.txt"):

    $root = (Get-Location).Path; $out = 'C:\tmp\txt'
    $w = New-Object -ComObject Word.Application
    Get-ChildItem -Recurse -Filter *.doc 'formacja 1 rok','formacja 3rok' | ForEach-Object {
      $rel = $_.FullName.Substring($root.Length + 1) -replace '[\\ ]', '_'
      [object]$dest = [string]($out + '\' + ($rel -replace '\.doc$', '.txt'))
      [object]$fmt = 7; [object]$enc = 65001; [object]$f = $false; [object]$e = ''
      $d = $w.Documents.Open([string]$_.FullName, $false, $true)
      $d.SaveAs2([ref]$dest, [ref]$fmt, [ref]$f, [ref]$e, [ref]$f, [ref]$e, [ref]$f, [ref]$f, [ref]$f, [ref]$f, [ref]$f, [ref]$enc)
      $d.Close([ref]$f)
    }
    $w.Quit()

2. python scripts/parse_formacja.py C:\tmp\txt [podglad.txt]

Nowy zeszyt: dopisz go do SECTIONS (nazwa pliku .txt bez rozszerzenia, numer
tygodnia, tytuł). Heurystyki (tytuł dnia, zadania "Zapisz"/"Tekst do
modlitwy", "Zapamiętaj") nie są doskonałe - przejrzyj plik podglądu i w razie
potrzeby dopisz poprawkę do TITLE_OVERRIDES / LABEL_OVERRIDES / post_patch.
"""
import re, json, sys, os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TXT = sys.argv[1] if len(sys.argv) > 1 else 'txt'
REVIEW = sys.argv[2] if len(sys.argv) > 2 else None
OUT = os.path.join(REPO, 'src', 'data', 'formacjaContent.json')

books = json.load(open(os.path.join(REPO, 'src/data/biblia_books.json'), encoding='utf-8'))['order']
bible = json.load(open(os.path.join(REPO, 'src/data/biblia.json'), encoding='utf-8'))

ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7}

SECTIONS = [
    ('rok1', 'Rok I', 'Dziennik Nowego Życia', [
        ('formacja_1_rok_01_Zeszyt_Wstepny', 1, 'Tydzień wstępny'),
        ('formacja_1_rok_02_Poznaj_rodzine', 2, None),  # ręcznie opracowany w formacja.ts
        ('formacja_1_rok_03_Ojciec_mowi', 3, 'Twój Ojciec mówi do Ciebie'),
        ('formacja_1_rok_04_Koniecznosc_wzrostu', 4, 'Konieczność wzrostu'),
        ('formacja_1_rok_05_Ucz_sie_chodzic', 5, 'Ucz się chodzić'),
        ('formacja_1_rok_06_Kwadans', 6, 'Kwadrans szczerości'),
        ('formacja_1_rok_07_Nowe_Zainteresowania', 7, 'Nowe zainteresowania'),
        ('formacja_1_rok_08_Nowe_Zajecia', 8, 'Nowe zajęcia'),
        ('formacja_1_rok_09_Jestes_w_reku_Ojca', 9, 'Jesteś w ręku Ojca'),
        ('formacja_1_rok_10_Modlitwa_dziecka_Bozego', 10, 'Modlitwa dziecka Bożego'),
        ('formacja_1_rok_11_Masz_Przewodnika', 11, 'Masz Przewodnika'),
        ('formacja_1_rok_12_Badz_swiatlem', 12, 'Twoje życie jest światłem'),
        ('formacja_1_rok_13_Szczesliwy_dom', 13, 'Jak stworzyć szczęśliwy dom?'),
        ('formacja_1_rok_14_Normy', 14, 'Nowe normy'),
        ('formacja_1_rok_15_Wolnosc', 15, 'Nowa wolność'),
        ('formacja_1_rok_16_Podsumowanie', 16, 'Podsumowanie'),
        ('formacja_1_rok_17_Pewnosc', 17, 'Pewność chrześcijańska'),
    ]),
    ('rok3-kosciol', 'Rok III', 'Kościół', [
        ('formacja_3rok_kosciol_01_Duch_Swiety_w_dzialaniu', 1, 'Duch Święty w działaniu'),
        ('formacja_3rok_kosciol_02_Pierwsze_wieki_Kosciola', 2, 'Pierwsze wieki Kościoła'),
        ('formacja_3rok_kosciol_03_Misterium_Wspolnoty', 3, 'Misterium widzialnej i niewidzialnej wspólnoty'),
        ('formacja_3rok_kosciol_04_Sakramenty', 4, 'Sakramenty'),
        ('formacja_3rok_kosciol_05_Obdarowania_naturalne', 5, 'Obdarowania naturalne'),
        ('formacja_3rok_kosciol_06_Charyzmaty', 6, 'Charyzmaty'),
        ('formacja_3rok_kosciol_07_Zycie_wspolnoty_poslugi', 7, 'Życie wspólnoty – posługi'),
        ('formacja_3rok_kosciol_08_Podejmowanie_poslug', 8, 'Podejmowanie posług'),
        ('formacja_3rok_kosciol_09_Powolanie_swieckich', 9, 'Powołanie świeckich'),
        ('formacja_3rok_kosciol_10_Maryja_i_inni', 10, 'Maryja i inni'),
        ('formacja_3rok_kosciol_11_Pytania_o_Kosciol', 11, 'Pytania o Kościół'),
    ]),
    ('rok3-osobowosc', 'Rok III', 'Dojrzała osobowość', [
        ('formacja_3rok_dojrzala_osobowosc_01_Rownowaga_psychiczna', 1, 'Równowaga psychiczna'),
        ('formacja_3rok_dojrzala_osobowosc_02_Stabilny_rozwoj', 2, 'Stabilny rozwój'),
        ('formacja_3rok_dojrzala_osobowosc_03_Ugruntowana_wiara', 3, 'Ugruntowana wiara'),
        ('formacja_3rok_dojrzala_osobowosc_04_duchowosc_SNE_euch', 4, 'Duchowość SNE jest eucharystyczna'),
    ]),
]

# Ręczne poprawki tam, gdzie heurystyka nie wystarcza (id dnia -> pola).
TITLE_OVERRIDES = {
    'tydzien-6-dzien-1': 'Miłość do Boga i bliźnich',
    'tydzien-6-dzien-2': 'Przegląd I tygodnia',
    'tydzien-6-dzien-3': 'Przegląd II tygodnia',
    'tydzien-6-dzien-4': 'Kwadrans szczerości',
    'tydzien-6-dzien-5': 'Przegląd III tygodnia',
    'tydzien-6-dzien-6': 'Przegląd IV tygodnia',
    'tydzien-6-dzien-7': 'Złota myśl miesiąca',
    'rok3-kosciol-tydzien-2-dzien-1': 'Życie wspólnoty',
    'rok3-kosciol-tydzien-10-dzien-6': 'Tomasz z Akwinu, Katarzyna ze Sieny, Ignacy z Loyoli',
    'rok3-kosciol-tydzien-10-dzien-7': 'Teresa od Dzieciątka Jezus',
    'rok3-kosciol-tydzien-2-dzien-6': 'Kościół mówiący – Kartagina',
    'rok3-kosciol-tydzien-2-dzien-7': 'Kościół mówiący – Aleksandria',
    'tydzien-1-dzien-1': 'Słowo w czyn',
    'tydzien-3-dzien-1': 'Bóg mówi wieloma sposobami',
    'tydzien-7-dzien-1': 'Duchowe oczy',
    'tydzien-9-dzien-1': 'Wolność wyboru',
    'tydzien-9-dzien-2': 'On jest Bogiem, Ty człowiekiem',
    'tydzien-9-dzien-3': 'On jest Stworzycielem, Ty stworzeniem',
    'tydzien-9-dzien-4': 'On jest Ojcem, Ty Jego dzieckiem',
    'tydzien-9-dzien-5': 'Syn Boży – Twój Mistrz',
    'tydzien-9-dzien-6': 'Jezus – „Bóg zbawia”',
    'tydzien-9-dzien-7': 'Jezus Panem i Głową Kościoła',
    'tydzien-10-dzien-1': 'Święć się imię Twoje',
    'tydzien-10-dzien-2': 'Przyjdź Królestwo Twoje',
    'tydzien-10-dzien-3': 'Bądź wola Twoja',
    'tydzien-10-dzien-4': 'Chleba naszego powszedniego',
    'tydzien-10-dzien-5': 'Odpuść nam nasze winy',
    'tydzien-10-dzien-6': 'Nie wódź nas na pokuszenie',
    'tydzien-10-dzien-7': 'Zbaw nas ode złego',
    'tydzien-12-dzien-1': 'Twoje życie jest światłem',
    'tydzien-13-dzien-1': 'Bóg stworzył rodzinę',
    'tydzien-14-dzien-1': 'Prawo od Boga',
    'tydzien-15-dzien-1': 'Prawdziwa wolność',
    'tydzien-16-dzien-1': 'Co dała Ci formacja?',
    'tydzien-16-dzien-2': 'Przegląd: pierwsze dwa tygodnie',
    'tydzien-16-dzien-3': 'Przegląd: od „Konieczności wzrostu” do „Kwadransu szczerości”',
    'tydzien-16-dzien-4': 'Przegląd: Nowe zainteresowania i Nowe zajęcia',
    'tydzien-16-dzien-5': 'Przegląd: od „Ojciec i Syn” do „Szczęśliwego domu”',
    'tydzien-16-dzien-6': 'Przegląd: Nowe normy i Nowa wolność',
    'tydzien-16-dzien-7': 'Wnioski na przyszłość',
    'rok3-kosciol-tydzien-5-dzien-3': 'Dar spostrzegania',
    'rok3-kosciol-tydzien-5-dzien-4': 'Dar nauczania i napominania',
    'rok3-kosciol-tydzien-5-dzien-5': 'Dar dawania',
    'rok3-kosciol-tydzien-5-dzien-6': 'Dar miłosierdzia',
    'rok3-kosciol-tydzien-8-dzien-1': 'Era charyzmatyczna',
    'rok3-kosciol-tydzien-9-dzien-2': 'Powołanie do świata',
    'rok3-kosciol-tydzien-10-dzien-4': 'Hieronim – tłumacz Biblii',
    'rok3-kosciol-tydzien-10-dzien-5': 'Cyryl i Metody',
    'rok3-kosciol-tydzien-11-dzien-1': 'Co to znaczy, że Kościół jest jeden?',
    'rok3-osobowosc-tydzien-1-dzien-1': 'Dojrzała osobowość',
    'rok3-osobowosc-tydzien-1-dzien-2': 'Właściwy obraz siebie',
}
# (id dnia, stara etykieta) -> nowa etykieta (None = usuń zadanie)
LABEL_OVERRIDES = {
    ('tydzien-5-dzien-4', 'Zapisz to'): 'Zapisz, co możesz zrobić, aby wzmocnić swoje duchowe mięśnie',
    ('tydzien-15-dzien-4', 'Odwracam się teraz od'): 'Określ wszystkie praktyki, które teraz porzucasz',
    ('rok3-kosciol-tydzien-9-dzien-3', 'Zapisz to'): 'Zapisz, jak powinna wyglądać Twoja służba względem nich',
    ('rok3-kosciol-tydzien-9-dzien-1', 'Przykłady w Biblii'): None,
    ('tydzien-11-dzien-7', 'Naucz się owoców na pamięć'): None,
    ('tydzien-4-dzien-2', 'Zapisz Mt 4,4: "Lecz On mu odparł'): 'Zapisz: Mt 4,4 – „Lecz On mu odparł…”',
    ('rok3-osobowosc-tydzien-4-dzien-5', 'Bo wiedzą, że są dla mnie ważniejsi niż moja praca, odpoczynek albo plany?'):
        'Czy są cztery osoby, które mogą zapukać do moich drzwi o każdej godzinie?',
    ('tydzien-11-dzien-5', 'Przeczytaj Dz 4,29-31 Zapisz wers 31 b'): 'Przeczytaj Dz 4,29-31 i zapisz werset 31b',
}

# --- Odnośniki biblijne ----------------------------------------------------
BOOK_ALIASES = {'Efezjan': 'Ef', 'Hebrajczyków': 'Hbr', 'Psalmu': 'Ps', 'Dzieje Apostolskie': 'Dz', 'Jan': 'J'}
book_alt = '|'.join(sorted([re.escape(b).replace(r'\ ', r'\s*') for b in books]
                           + [re.escape(a).replace(r'\ ', r'\s+') for a in BOOK_ALIASES], key=len, reverse=True))
VERSE = r'\d+[a-z]?'
REF_RE = re.compile(
    r'(?<![A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])(' + book_alt + r')\s*(\d+)'
    r'(?:\s*[,:]\s*(' + VERSE + r'(?:\s*[-–]\s*\d+(?:\s*,\s*' + VERSE + r')?[a-z]?)?(?:\s*\.\s*' + VERSE + r'(?:\s*[-–]\s*' + VERSE + r')?)*)'
    r'|\s+(\d+\s*[-–]\s*\d+)(?=\D|$))?'
)


def norm_book(b):
    b2 = re.sub(r'\s+', ' ', b).strip()
    if b2 in BOOK_ALIASES:
        return BOOK_ALIASES[b2]
    b3 = b2.replace(' ', '')
    for k in books:
        if k.replace(' ', '') == b3:
            return k
    return None


def norm_ref(m):
    book = norm_book(m.group(1))
    ch = m.group(2)
    vs = m.group(3) or m.group(4)
    if not vs:
        return f'{book} {ch}'
    vs = re.sub(r'\s+', '', vs).replace('–', '-')
    if re.fullmatch(r'\d{4}', vs) and int(vs[:2]) < int(vs[2:]):  # "Łk 24,4452" -> 44-52
        vs = vs[:2] + '-' + vs[2:]
    vs = vs.rstrip('.').replace('.', '. ')
    return f'{book} {ch},{vs}'


def chapter_count(book, ch):
    return len(bible.get(book, {}).get(str(ch), []))


def ref_valid(ref):
    m = re.fullmatch(r'(.+?) (\d+)(?:,(.+))?', ref)
    if not m:
        return False
    book, ch, vs = m.group(1), int(m.group(2)), m.group(3)
    if chapter_count(book, ch) == 0:
        return False
    if not vs:
        return True
    cross = re.fullmatch(r'(\d+)[a-z]?-(\d+),(\d+)[a-z]?', vs)
    if cross:
        return chapter_count(book, int(cross.group(2))) > 0
    for seg in vs.split('.'):
        seg = seg.strip()
        if not seg:
            continue
        r = re.fullmatch(r'(\d+)[a-z]?(?:-(\d+)[a-z]?)?', seg)
        if not r or int(r.group(1)) > chapter_count(book, ch):
            return False
    return True


# --- Czyszczenie -----------------------------------------------------------
BLANK = '\u2581'  # miejsce do wpisania (kropki w zeszycie)
ELLIPSIS = '…'


def clean_line(l):
    l = l.replace('\u00a0', ' ').replace('\t', ' ').replace('\x0b', ' ').replace('\x0c', ' ')
    l = re.sub(r'(?:[.…_]{4,}[\s.…_]*)+', f' {BLANK} ', l)
    l = re.sub(r'-{5,}', '', l)
    l = re.sub(r'\s+', ' ', l).strip()
    l = re.sub(r'"([^"]*)"', '„\\1”', l)
    l = re.sub(r'\(\s+', '(', l)
    l = re.sub(r'\s+\)', ')', l)
    l = re.sub(r'\s+([,;!?])(?=\s|$)', r'\1', l)
    return l


def letters(s):
    return re.sub(r'[^A-ZĄĆĘŁŃÓŚŹŻ]', '', s.upper())


COVER_RE = re.compile(
    r'(?i)^(dziennik\s+nowego\s+życia.*|formacja\s+podstawowa|rok\s+i+|[/(]\s*cz\..*|tydzie[ńn]\s+([ivx]+|wstępny).*'
    r'|sne\s+gliwice.*|kościół|dojrzała\s+osobowość)$'
)
DAY_RE = re.compile(r'(?i)^dzie[ńn]\s+(VII|VI|IV|V|III|II|I)\b\s*[-–.:]?\s*(.*)$')


def split_days(lines, title_variants):
    days, intro, cur, after_cover = {}, [], None, False
    for raw in lines:
        l = clean_line(raw)
        if not l:
            continue
        dm = DAY_RE.match(l)
        if dm:
            cur = ROMAN[dm.group(1).upper()]
            days[cur] = []
            after_cover = False
            if dm.group(2):
                days[cur].append(dm.group(2))
            continue
        if COVER_RE.match(l):
            after_cover = True
            continue
        if letters(l) in title_variants:
            continue
        if after_cover or cur is None:
            intro.append(l)
        else:
            days[cur].append(l)
    return intro, days


# --- Parsowanie dnia -------------------------------------------------------
PRAY_KW = re.compile(
    r'(?i)(tekst\s+do\s+modlit\w*|tekst\s+na\s+dziś|dziś\s+wykorzystaj\s+tekst|pomódl\s+się\s+korzystając\s+z\s+tekstu'
    r'|możesz\s+tak\s+się\s+modlić|(?<![a-ząćęłńóśźż])tekst)\s*[:.]?\s*'
)
REMEMBER_RE = re.compile(r'(?i)/\s*zapamiętaj(\s+to\s+(?:ostatnie\s+)?zdanie)?\s*:?\s*/?\s*:?')
BULLET_RE = re.compile(r'^([•*·\-–]|\uf0b7|\uf0a7)\s*')
WRITE_VERB = r'(?:zapisz|napisz|przepisz|wypisz|opisz|wpisz|uzupełnij)'
NUM_HEADING = re.compile(r'^(\d+)\.\s*(\S.{0,60}?)\.?$')


def split_sentences(text):
    parts = [p for p in re.split(r'(?<=[.!?])\s+(?=[„"(A-ZĄĆĘŁŃÓŚŹŻ*•])', text) if p.strip()]
    out = []
    for p in parts:  # "1." / "a)" jako osobny kawałek -> sklej z następnym zdaniem
        if out and (re.fullmatch(r'\d+\.|[a-zA-Z][).]', out[-1].strip())
                    or re.search(r'(?i)\b(św|np|tzn|tj|ok|zm|ur|r|w|ks|bp|kard|por|ps|wg)\.$', out[-1])):
            out[-1] = out[-1] + ' ' + p
        else:
            out.append(p)
    return out


class Day:
    def __init__(self, did):
        self.id = did
        self.paragraphs, self.tasks, self.remember = [], [], []
        self.last_blank = False

    def task(self, kind, label, ref=None):
        label = re.sub(r'^\d+\.\s*', '', BULLET_RE.sub('', label)).strip()
        key = (self.id, label)
        if key in LABEL_OVERRIDES:
            label = LABEL_OVERRIDES[key]
            if label is None:
                return
        if not label:
            return
        if ref and not ref_valid(ref):
            print('  !! niepoprawny odnośnik:', self.id, ref, '|', label, file=sys.stderr)
            ref = None
        t = {'label': label, 'kind': kind}
        if ref:
            t['reference'] = ref
        if not any(x['label'] == label for x in self.tasks):
            self.tasks.append(t)

    def para(self, text):
        text = text.strip()
        if not text or text in (':', '-', '–'):
            return
        bm = BULLET_RE.match(text)
        if bm and len(text) > 2:
            text = '• ' + text[bm.end():]
        self.paragraphs.append(text)


def extract_pray(day, l):
    """'Tekst do modlitwy: REF ...' -> zadania; zwraca (prefix, rest) albo None."""
    for km in PRAY_KW.finditer(l):
        after = l[km.end():]
        refs, pos = [], 0
        while True:
            m = REF_RE.match(after, pos)
            if not m:
                break
            refs.append(norm_ref(m))
            pos = m.end()
            sep = re.match(r'\s*[;,]?\s*', after[pos:])
            if REF_RE.match(after, pos + sep.end()):
                pos += sep.end()
            else:
                break
        if not refs:
            continue
        prefix = l[:km.start()].strip()
        rest = after[pos:].strip(' .;/')
        suffix, extra = '', None
        if rest:
            if re.match(r'(?i)' + WRITE_VERB, rest):
                day.task('write', rest.rstrip(': '))
                rest = ''
            elif len(rest) <= 90 and len(refs) == 1:
                suffix = ' – ' + rest.strip('()/ ')
            else:
                extra = rest
        for r in refs:
            day.task('pray', f'Módl się tekstem: {r}' + suffix, r)
        return prefix, extra
    return None


VERB_ONLY_RE = re.compile(r'(?i)((?:zapisz|napisz|przepisz)(?:\s+i)?(?:\s+(?:zapamiętaj|naucz\s+się\s+na\s+pamięć))?)?(?:\s+i)?')


TRAIL_RE = re.compile(r'(' + REF_RE.pattern + r')\s*:?\s*([„"][^"”]*)?$')


def write_ref_task(day, sent, has_blank):
    """Zdanie z odnośnikiem do przepisania. Zwraca tekst, który zostaje w akapicie, albo None (nie dotyczy)."""
    s = sent.strip()
    refs = list(REF_RE.finditer(s))
    if not refs:
        return None
    if re.search(r'(?i)\b' + WRITE_VERB + r'\b', s):
        rest = re.sub(r'[\s:.,;]+', ' ', REF_RE.sub(' ', s)).strip()
        if VERB_ONLY_RE.fullmatch(rest):
            mem = bool(re.search(r'(?i)zapamiętaj|pamięć', rest))
            v = 'Zapisz i zapamiętaj' if mem else 'Zapisz'
            for m in refs:
                r = norm_ref(m)
                day.task('write', f'{v}: {r}', r)
        else:
            label = REF_RE.sub(lambda m: norm_ref(m), s).rstrip(':. ')
            day.task('write', label, norm_ref(refs[0]))
        return ''
    if not has_blank:
        return None
    m = TRAIL_RE.search(s)
    if not m:
        return None
    r = norm_ref(REF_RE.match(m.group(1)))
    quote = (m.group(m.lastindex) or '').strip() if m.group(m.lastindex) and m.group(m.lastindex)[:1] in '„"' else ''
    label = f'Zapisz: {r}'
    if quote:
        label += ' – „' + quote.lstrip('„"').rstrip(' ,') + '…”'
    day.task('write', label, r)
    before = s[:m.start()].strip()
    if not before:
        return ''
    if before.endswith(('.', '!', '?')):
        return before
    return (before + ' ' + r).strip()


def handle_blanks(day, l):
    """Linia z miejscami do wpisania albo poleceniem 'Zapisz REF'. Zwraca tekst, który zostaje w akapicie."""
    chunks = l.split(BLANK)
    out = []
    consumed_any = False
    for i, chunk in enumerate(chunks):
        has_blank = i < len(chunks) - 1
        text = chunk.strip()
        sents = split_sentences(text) if text else []
        last = sents[-1] if sents else ''
        # "Zapisz słowa Jezusa:" w poprzednim akapicie + "Mk 9,35 ……" w tej linii
        if (i == 0 and has_blank and len(sents) == 1 and REF_RE.match(last)
                and not re.sub(r'[\s:.,;]+', '', REF_RE.sub('', last)) and day.paragraphs):
            psents = split_sentences(day.paragraphs[-1])
            if psents[-1].endswith(':') and re.search(r'(?i)\b' + WRITE_VERB + r'\b', psents[-1]):
                day.paragraphs.pop()
                if len(psents) > 1:
                    day.paragraphs.append(' '.join(psents[:-1]))
                last = psents[-1] + ' ' + last
        left = write_ref_task(day, last, has_blank) if last else None
        if left is not None:
            text = ' '.join(sents[:-1] + ([left] if left else [])).strip()
            consumed_any = True
        elif has_blank:
            lab = last.rstrip(': ')
            is_q = lab.endswith('?') or last.endswith(':')
            has_verb = re.search(r'(?i)\b' + WRITE_VERB + r'\b', lab)
            if lab and ((is_q and (len(lab.split()) >= 3 or lab.endswith('?'))) or has_verb):
                day.task('write', lab)
                consumed_any = True
                if len(sents) == 1 and i == 0:
                    text = ''  # cała linia to polecenie - zostaje tylko jako zadanie
                else:
                    text = text.rstrip(': ') + ' ' + ELLIPSIS
            elif not text:
                if day.last_blank or consumed_any:
                    pass  # kolejne linie kropek pod tym samym zadaniem
                elif out:
                    out[-1] += ' ' + ELLIPSIS
                elif day.paragraphs and day.paragraphs[-1].endswith((':', '?')) and len(day.paragraphs[-1]) < 220:
                    prev = day.paragraphs.pop()
                    psents = split_sentences(prev)
                    left = write_ref_task(day, psents[-1], True)
                    if left is None:
                        day.task('write', psents[-1].rstrip(': '))
                    elif left:
                        psents = psents[:-1] + [left, '']
                    if len(psents) > 1:
                        day.paragraphs.append(' '.join(psents[:-1]))
                    consumed_any = True
            else:
                text = text.rstrip(':') + ' ' + ELLIPSIS
        if text:
            out.append(text)
    day.last_blank = consumed_any or (not ''.join(chunks).strip())
    res = ' '.join(out).strip()
    if re.fullmatch(r'(\d+\.?|[-–:.]|' + ELLIPSIS + r'|\s)*', res):  # puste pozycje formularza
        return ''
    return res


def pick_title(lines):
    if not lines:
        return None, lines
    first = lines[0]
    second = lines[1] if len(lines) > 1 else ''
    third = lines[2] if len(lines) > 2 else ''
    sentence_like = first.endswith('.') and len(first.split()) > 9
    is_list = re.match(r'^1\.\s', first) and re.match(r'^2\.\s', second)
    bad = (len(first) > 70 or PRAY_KW.match(first) or BLANK in first or REF_RE.match(first)
           or first.endswith(':') or sentence_like or is_list)
    if bad:
        nh = NUM_HEADING.match(second)
        if sentence_like and nh and not re.match(r'^\d+\.', third):
            return nh.group(2).strip(' .'), [first] + lines[2:]
        return None, lines
    title = re.sub(r'^\d+\.\s*', '', first).strip(' .')
    nh = NUM_HEADING.match(second)
    if nh and not re.match(r'^\d+\.', third) and not second.endswith(':'):
        return f'{title} – {nh.group(2).strip(" .")}', lines[2:]
    return title, lines[1:]


def parse_day(lines, did):
    day = Day(did)
    title, lines = pick_title(lines)
    pending = None  # 'para' - następna linia to ZAPAMIĘTAJ, 'write' - następne zadanie zapisu do zapamiętania
    for l in lines:
        rm = REMEMBER_RE.search(l)
        if rm:
            before = l[:rm.start()].strip()
            after = l[rm.end():].strip(' /')
            if after and BLANK not in after:
                day.remember.append(after)
                if before:
                    day.para(before)
                continue
            if before and BLANK not in before:
                if before.endswith(':'):
                    day.para(before)
                    pending = 'write'
                    continue
                sents = split_sentences(before)
                day.remember.append(sents[-1])
                if len(sents) > 1:
                    day.para(' '.join(sents[:-1]))
                continue
            # sam znacznik w linii
            if rm.group(1) is None and ':' in rm.group(0):
                pending = 'para'
            elif day.last_blank and day.tasks and day.tasks[-1]['kind'] == 'write':
                t = day.tasks[-1]
                t['label'] = t['label'].replace('Zapisz:', 'Zapisz i zapamiętaj:')
            elif day.paragraphs:
                prev = day.paragraphs.pop()
                sents = split_sentences(prev)
                if len(prev) <= 200:
                    day.remember.append(prev)
                else:
                    day.remember.append(sents[-1])
                    day.para(' '.join(sents[:-1]))
            continue

        if pending == 'para' and BLANK not in l and not PRAY_KW.match(l):
            day.remember.append(l)
            pending = None
            continue

        pr = extract_pray(day, l)
        if pr is not None:
            prefix, extra = pr
            if extra:
                day.para(extra)
            day.last_blank = False
            if not prefix:
                continue
            l = prefix

        if BLANK in l or re.search(r'(?i)' + WRITE_VERB + r'[^:!?]{0,40}?:?\s*(?:' + book_alt + r')\s*\d', l):
            n_before = len(day.tasks)
            l = handle_blanks(day, l)
            if pending == 'write' and len(day.tasks) > n_before:
                t = day.tasks[-1]
                t['label'] = t['label'].replace('Zapisz:', 'Zapisz i zapamiętaj:')
                pending = None
            if not l:
                continue
        else:
            day.last_blank = False

        if (re.match(r'(?i)(napisz|zapisz|wypisz|opisz)', l) and len(l) <= 160
                and not REF_RE.search(l) and len(split_sentences(l)) == 1):
            day.task('write', l.rstrip('.: '))
            continue

        for m in re.finditer(r'(?i)(przeczytaj(?:\s+też|\s+jeszcze\s+raz)?|powrót\s+do)\s*:?\s*((?:' + book_alt + r')\s*\d[\d,\s\-–a-z.]*)', l):
            refs = [norm_ref(x) for x in REF_RE.finditer(m.group(2))]
            if refs:
                day.task('read', f'Przeczytaj: {refs[0]}', refs[0])

        day.para(l)
    return title, day


def fix_quotes(t):
    if t.count('"') == 0:
        return t
    t = re.sub(r'(^|[\s(])"', r'\1„', t)
    return t.replace('"', '”')


def replace_paras(d, start_text, end_text, new):
    ps = d['paragraphs']
    i = next(k for k, p in enumerate(ps) if p.startswith(start_text))
    j = next(k for k, p in enumerate(ps) if k >= i and p.startswith(end_text))
    d['paragraphs'] = ps[:i] + new + ps[j + 1:]


def add_task(d, label, kind='write'):
    d['tasks'].append({'id': f"{d['id']}-t{len(d['tasks']) + 1}", 'label': label, 'kind': kind})


def post_patch(d):
    """Dni z tabelkami/formularzami, których tekst po konwersji z .doc jest nieczytelny."""
    did = d['id']
    if did == 'tydzien-5-dzien-7':
        replace_paras(d, 'Ucisk wyrabia', 'nadzieję.', ['Ucisk wyrabia … Wytrwałość – … nadzieję.'])
    elif did == 'rok3-kosciol-tydzien-5-dzien-6':
        replace_paras(d, 'talent', 'wynik', [
            '• Dar spostrzegania: …', '• Dar służenia: …', '• Dar nauczania: …', '• Dar zachęty: …',
            '• Dar dawania: …', '• Dar zarządzania: …', '• Dar miłosierdzia: …'])
        add_task(d, 'Zestaw wyniki z 4 dni i sprawdź, który dar jest w Tobie najbardziej rozwinięty')
    elif did == 'rok3-kosciol-tydzien-9-dzien-1':
        replace_paras(d, 'posługa', 'Moje cechy', [
            'Uzupełnij swój schemat:', '• posługa: …', '• przykłady w Biblii: …',
            '• działania charakterystyczne dla tej posługi (5): …', '• moje cechy (6): …'])
        d['tasks'].insert(0, {'id': '', 'label': 'Uzupełnij swój schemat posługi', 'kind': 'write'})
    elif did == 'rok3-osobowosc-tydzien-1-dzien-1':
        add_task(d, 'Wybierz trzy dziedziny życia i zapisz, jaki widzisz w nich wzrost w ciągu ostatniego roku')
    elif did == 'rok3-osobowosc-tydzien-4-dzien-7':
        replace_paras(d, 'Przed: Po:', 'służba obmywania', [
            '• Przed: głoszenie (zapowiedzi), służba obmywania', '• W centrum: Eucharystia', '• Po: ucztowanie, ofiarowanie'])
    d['paragraphs'] = [fix_quotes(p) for p in d['paragraphs']]
    for i, t in enumerate(d['tasks']):
        t['id'] = f'{did}-t{i + 1}'
        t['label'] = fix_quotes(t['label'])
    if 'remember' in d:
        d['remember'] = fix_quotes(d['remember'])


def main():
    out_sections, report = [], []
    for sid, stitle, ssub, weeks in SECTIONS:
        sec = {'id': sid, 'title': stitle, 'subtitle': ssub, 'weeks': []}
        for fname, num, wtitle in weeks:
            if wtitle is None:
                sec['weeks'].append({'$curated': f'tydzien-{num}'})
                continue
            lines = open(os.path.join(TXT, fname + '.txt'), encoding='utf-8-sig').read().splitlines()
            variants = {letters(wtitle)}
            for l in lines:
                c = clean_line(l)
                if c and c.isupper() and 4 < len(c) < 70 and not DAY_RE.match(c) and not COVER_RE.match(c):
                    lt = letters(c)
                    if lt and (lt in letters(wtitle) or letters(wtitle) in lt or lt.startswith(letters(wtitle)[:8])):
                        variants.add(lt)
            intro, days = split_days(lines, variants)
            assert sorted(days) == list(range(1, 8)), (fname, sorted(days))
            wid = f'tydzien-{num}' if sid == 'rok1' else f'{sid}-tydzien-{num}'
            week = {'id': wid, 'number': num, 'title': wtitle}
            if intro:
                week['intro'] = [fix_quotes(p) for p in intro]
            week['days'] = []
            report.append(f'\n\n######## {stitle} {ssub} – Tydzień {num}: {wtitle}')
            for p in intro:
                report.append('  [INTRO] ' + p)
            for n in range(1, 8):
                did = f'{wid}-dzien-{n}'
                title, day = parse_day(days[n], did)
                if title and title == title.upper() and len(letters(title)) > 3:
                    title = title[0] + title[1:].lower()
                title = TITLE_OVERRIDES.get(did, title)
                if not title:
                    pray = [t for t in day.tasks if t['kind'] == 'pray' and 'reference' in t]
                    title = pray[0]['reference'] if pray else wtitle
                d = {'id': did, 'number': n, 'title': title, 'paragraphs': day.paragraphs}
                if day.remember:
                    d['remember'] = '\n\n'.join(day.remember)
                d['tasks'] = [dict(id=f'{did}-t{i + 1}', **t) for i, t in enumerate(day.tasks)]
                post_patch(d)
                week['days'].append(d)
                report.append(f'\n=== Dzień {n}: {title}')
                for p in day.paragraphs:
                    report.append('  ' + p)
                if day.remember:
                    report.append('  [ZAPAMIĘTAJ] ' + ' | '.join(day.remember))
                for t in d['tasks']:
                    report.append(f"  [{t['kind']}] {t['label']}" + (f"  <{t['reference']}>" if t.get('reference') else ''))
                for p in day.paragraphs:
                    if BLANK in p:
                        print('  !! BLANK w akapicie:', did, p[:80], file=sys.stderr)
            sec['weeks'].append(week)
        out_sections.append(sec)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out_sections, f, ensure_ascii=False, indent=1)
    if REVIEW:
        with open(REVIEW, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))


if __name__ == '__main__':
    main()
