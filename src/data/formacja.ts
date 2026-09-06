// src/data/formacja.ts
// Treści "Formacji" - "Dziennik Nowego Życia": program podzielony na
// tygodnie, a każdy tydzień na 7 dni. Każdy dzień ma krótki tekst do
// przeczytania i zadania (np. "Zapisz: J 14,26" albo "Módl się tekstem:
// Mk 1,35-39") - odhaczane na ekranie dnia i zapisywane trwale.
//
// Żeby dodać kolejny tydzień, dopisz kolejny obiekt do tablicy
// FORMACJA_WEEKS poniżej, w tym samym kształcie - pojawi się automatycznie
// na liście, bez zmian w ekranach.

export interface FormacjaTask {
  id: string;
  label: string;
  // "pray" - zadanie modlitwy fragmentem Biblii: `reference` da się rozbić na
  // pojedyncze wersety (bibliaService.resolveCitationVerses) i dodać do
  // wspólnego koszyka modlitwy. "write"/"read" - inne ćwiczenie (przepisanie,
  // przeczytanie) - referencja jest tylko informacyjna, appka jej nie
  // rozwiązuje na wersety do modlitwy.
  kind?: 'pray' | 'write' | 'read';
  reference?: string; // np. "Mk 1,14-20" - odnośnik w formacie rozpoznawanym przez resolveCitationVerses
}

export interface FormacjaDay {
  id: string;
  number: number; // 1-7, dzień w obrębie tygodnia (wyświetlany jako rzymski: I-VII)
  title: string;
  paragraphs: string[];
  bulletList?: string[];
  remember?: string; // "ZAPAMIĘTAJ TO ZDANIE" - wyróżniony cytat/myśl dnia
  tasks: FormacjaTask[];
}

export interface FormacjaWeek {
  id: string;
  number: number; // numer tygodnia (rzymski w materiale źródłowym, tu jako liczba)
  title: string;
  days: FormacjaDay[];
}

// Zamienia 1-7 (i więcej) na cyfry rzymskie - tak jak w oryginalnym materiale
// ("Dzień I", "Dzień II", ..., "Tydzień II").
const ROMAN_TABLE: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(num: number): string {
  let n = num;
  let result = '';
  for (const [value, symbol] of ROMAN_TABLE) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result || String(num);
}

export const FORMACJA_WEEKS: FormacjaWeek[] = [
  {
    id: 'tydzien-2',
    number: 2,
    title: 'Poznaj i pokochaj rodzinę',
    days: [
      {
        id: 'tydzien-2-dzien-1',
        number: 1,
        title: 'Wprowadzenie',
        paragraphs: [
          'Otrzymując tę małą pomoc pamiętaj, że najważniejsze jest Twoje serce. Nikt za Ciebie nie otworzy Pisma Świętego, nikt za Ciebie nie wyrazi wiary. Ty, na pierwszym miejscu, jesteś odpowiedzialny za swój rozwój. Bóg będzie Cię wspierał i zachęcał. Otwórz więc swe serce i karm się Jego Słowem i Ciałem gorliwie i systematycznie. Po drugie – warunkiem rozwoju jest codzienne studium i modlitwa. I w tym właśnie chcemy cię wspierać jako wspólnota Kościoła.',
          'Materiał ułożony został w poszczególnych tygodniach. Dzień pierwszy (ten, który aktualnie czytasz) to dzień spotkania ogólnego.',
          'W Szkole Nowej Ewangelizacji proponujemy codzienną modlitwę Słowem Bożym. Ten zeszycik będzie Ci towarzyszył podpowiadając niektóre szczegóły. Oto proponowany schemat naszej codziennej modlitwy:',
        ],
        bulletList: [
          'Skupienie',
          'Modlitwa do Ducha Świętego',
          'Oddanie wszystkiego Bogu',
          'Uwielbienie',
          'Przeczytanie tekstu Biblii',
          'Słuchanie i podziękowanie',
          'Uwielbienie',
        ],
        tasks: [
          {
            id: 'tydzien-2-dzien-1-t1',
            label: 'Módl się dziś tekstem: J 3,16-21',
            kind: 'pray',
            reference: 'J 3,16-21',
          },
        ],
      },
      {
        id: 'tydzien-2-dzien-2',
        number: 2,
        title: 'Przyjęcie zbawienia',
        paragraphs: [
          'Jako ochrzczeni jesteśmy zanurzeni w śmierci Jezusa (Rz 6,3). Rozpoczął się w nas proces zbawienia. Jego celem jest przyjęcie nowego życia (Rz 6,4). Można by użyć porównania ze stadiami rozwoju motyla. Jako dzieci jesteśmy piękną gąsienicą. Jakiś kontakt z Bogiem mamy, ale nie wystarczający już, gdy się rozwijamy. Sieć pytań i wątpliwości zaczyna otaczać nasz umysł i serce. Stajemy się jak larwa zawieszona w kokonie między niebem a ziemią. Potrzebny jest jeszcze jeden moment: decyzja wiary (Rz 10,9-10). Wówczas stajemy się takimi, jakich chce nas Bóg („Bez wiary nie można podobać się Bogu” Hbr 11,6). Od tej chwili jesteśmy pięknymi motylami na łąkach Jego królestwa.',
          'W Katechizmie Kościoła Katolickiego czytamy:',
          '„U wszystkich ochrzczonych, dzieci i dorosłych, po chrzcie wiara powinna wzrastać. Dlatego co roku podczas Wigilii Paschalnej Kościół celebruje odnowienie przyrzeczeń chrztu. Przygotowanie do chrztu stawia człowieka jedynie na progu nowego życia.” (KKK 1254)',
          '„Pierwszym dziełem łaski Ducha Świętego jest nawrócenie, które dokonuje usprawiedliwienia zgodnie z zapowiedzią Jezusa na początku Ewangelii: «Nawracajcie się, albowiem bliskie jest Królestwo niebieskie» (Mt 4,17). Człowiek poruszony przez łaskę zwraca się do Boga i odwraca od grzechu, przyjmując w ten sposób przebaczenie i sprawiedliwość z wysoka.” (KKK 1989)',
          'Każda decyzja wiary (a taką podjąłeś) powoduje, iż działają w tobie siły duchowe.',
        ],
        remember:
          'Przemiany będą o wiele większe niż te, które nastąpiły u larwy. Bóg czyni Cię stopniowo podobnym do Chrystusa. Stałeś się dzieckiem Boga (to twoja godność) i stajesz się chrześcijaninem (to twoje zadanie). Jak motyl masz korzystać z tego co piękne i dobre na ziemi, ale też masz się od niej odrywać.',
        tasks: [
          {
            id: 'tydzien-2-dzien-2-t1',
            label: 'Podziękuj za łaskę wiary i módl się tekstem: Mk 1,1-13',
            kind: 'pray',
            reference: 'Mk 1,1-13',
          },
        ],
      },
      {
        id: 'tydzien-2-dzien-3',
        number: 3,
        title: 'Co się wydarzyło?',
        paragraphs: [
          'Gdy przyjąłeś Jezusa jako Zbawiciela, oddałeś Mu swój grzech i swoją nieprawość. On natomiast obdarzył Cię szatą łaski. Może dopiero teraz świadomie podszedłeś do procesu, który dokonuje się w cudownym spotkaniu jakim jest sakrament pokuty. Jest to spotkanie ze Zbawcą, który wydobywa Cię z każdego bagna. Wystarczy wyrazić żal i przyznać się do swej grzeszności.',
          'Gdy wyznałeś Jezusa swoim Panem, czyli poddałeś Jego kierownictwu wszystkie dziedziny życia, dokonała się swego rodzaju wymiana. Ty oddałeś Mu swoje życie, a On dał Ci swoje. Dlatego mówimy, że otrzymujemy w tym procesie nowe życie (to wydarzenie nie jest możliwe bez Twojej zgody). Zmartwychwstały Jezus jest dawcą tego życia. Od tej chwili dbaj więc o to duchowe życie. Jezus natomiast dbał będzie o twoje sprawy.',
          'Niektórzy myślą, że życie chrześcijańskie to nudne mamrotanie formułek, albo zamartwianie się i smutek aż do śmierci. Nic bardziej fałszywego! Twoje nowe życie pochodzi od Tego, który zwyciężył śmierć, pokonał szatana i przygotowuje Ci weselne przyjęcie, które nigdy się nie skończy. Jasno też powiedział po co, jak dobry Pasterz, przyszedł do nas - swych owiec.',
          'W tym nowym życiu odnajdziesz nowy sens, nowe cele i nowe perspektywy. Rozpoczynasz piękną przygodę z Jezusem, który przynosi pokój i radość – owoc przemiany i decyzji Twego serca. Bóg Ci daje teraz nowe spojrzenie na wszystko. Przywraca bądź stwarza wrażliwość na to, co dobre i piękne. Doświadczysz też nowego poczucia Bożej obecności, dobroci i mocy. Wkłada On też w Twe serce nowe pragnienia podobania się Jemu i pomocy innym. Wszystko to razem zaczyna nadawać nowy kierunek Twoim działaniom.',
          'Przemiana, której dokonał w Tobie Duch Święty, ma wpływ na wszystko. Przejście ze śmierci do życia nie jest drobnostką (J 3,5-6).',
          'Powinieneś (powinnaś) przyjąć to, co Bóg z miłości przygotował dla Ciebie. On dał Ci nową naturę, a teraz Twoim zadaniem jest rozwijanie jej. Zacznij od dzisiaj. Zobaczysz jak wiele dobrodziejstw odkryjesz przyjmując miłość Ojca i dar Jego zbawienia w Chrystusie. Twym głównym zadaniem jest: TRWAĆ W CHRYSTUSIE!',
        ],
        tasks: [
          { id: 'tydzien-2-dzien-3-t1', label: 'Zapisz: J 10,10', kind: 'write', reference: 'J 10,10' },
          {
            id: 'tydzien-2-dzien-3-t2',
            label: 'Zapisz i zapamiętaj: J 15,4-5',
            kind: 'write',
            reference: 'J 15,4-5',
          },
          {
            id: 'tydzien-2-dzien-3-t3',
            label: 'Módl się tym fragmentem (J 15,4-5), dziękując za życie w obfitości',
            kind: 'pray',
            reference: 'J 15,4-5',
          },
        ],
      },
      {
        id: 'tydzien-2-dzien-4',
        number: 4,
        title: 'Bóg jest Twoim Ojcem',
        paragraphs: [
          'Bóg nie jest kimś surowym i odległym. To prawda, że jest sprawiedliwy. Ale nie jest to straszne, lecz cudowne: to On zaprowadza ład i porządek w chaos spowodowany grzechem; to On rozlewa miłość w miejscach nienawiści; to On przebacza nieprawość. Tak objawia się sprawiedliwość Boga. Jeśli jest sprawiedliwym Ojcem, to jak nikt inny rozumie twoje motywy i poruszenia serca.',
          'Miłość Boża jest „wieczysta” (Iz 54,8).',
          'Nie musisz przed Nim udawać. Mów Mu o swych zwycięstwach i klęskach. Ciesz się tym, co otrzymałeś i bez obawy wyraź żal gdy coś zepsułeś. Twój Ojciec chce, byś z Nim rozmawiał szczerze i ufnie. Opowiadaj Mu o wszystkich swoich problemach. On chce Cię słuchać. To jedna z pierwszych relacji, która Cię będzie zachwycać. On interesuje się Tobą i wszystkim co ma z Tobą związek. Nie musisz używać pięknych słów, czy wyuczonych formułek by się pomodlić. Czasem one pomagają. Teraz po prostu powiedz, co jest w Twoim sercu.',
          'Określając Boga imieniem „Ojciec”, język wiary wskazuje przede wszystkim na dwa aspekty: że Bóg jest początkiem wszystkiego i autorytetem oraz że równocześnie jest dobrocią i miłującą troską obejmującą wszystkie swoje dzieci. Ta ojcowska tkliwość Boga może być wyrażona w obrazie macierzyństwa, który jeszcze bardziej uwydatnia bliskość między Bogiem i stworzeniem. Język wiary czerpie więc z ludzkiego doświadczenia rodziców, którzy w pewien sposób są dla człowieka pierwszymi przedstawicielami Boga. Jednak doświadczenie to mówi także, że rodzice ziemscy są omylni i że mogą zdeformować oblicze ojcostwa i macierzyństwa. Należy więc przypomnieć, że Bóg przekracza ludzkie rozróżnienie płci. Nie jest ani mężczyzną, ani kobietą, jest Bogiem. Przekracza także ludzkie ojcostwo i macierzyństwo, chociaż jest ich początkiem i miarą: nikt nie jest ojcem tak jak Bóg (KKK 239).',
          'Podziękuj za bezwarunkową miłość Ojca w niebie.',
        ],
        tasks: [
          { id: 'tydzien-2-dzien-4-t1', label: 'Zapisz: Iz 54,10', kind: 'write', reference: 'Iz 54,10' },
          { id: 'tydzien-2-dzien-4-t2', label: 'Zapisz: Jr 31,3', kind: 'write', reference: 'Jr 31,3' },
          {
            id: 'tydzien-2-dzien-4-t3',
            label: 'Módl się tekstem: Mk 1,14-20',
            kind: 'pray',
            reference: 'Mk 1,14-20',
          },
        ],
      },
      {
        id: 'tydzien-2-dzien-5',
        number: 5,
        title: 'Jezus jest Twoim Bratem',
        paragraphs: [
          'Chrystus jest Synem Pierworodnym Boga, czyli naszym starszym bratem. Oznacza to wielką bliskość, ale też wielki szacunek. Każdorazową współpracę i dążenie by być „jak starszy brat”.',
          'On podejmuje te najtrudniejsze w rodzinie zadania. Nikt z nas nie potrafi zbawić siebie – przetransportować do nieba - ale mamy starszego Brata. Nikt z nas nie potrafi zapłacić za wszystkie nasze grzechy – ale mamy starszego Brata. Nikt z nas nie ma w sobie doskonałej miłości. Możemy ją wziąć od starszego Brata. On jest pełen mocy i siły, których używa z miłością, by Cię wyciągnąć z każdego kłopotu. Ponieważ stał się człowiekiem i żył na ziemi, rozumie Twoje problemy.',
          'Jezus jest Panem. Bardzo często w Ewangeliach ludzie zwracają się do Jezusa, nazywając Go „Panem”. Tytuł ten świadczy o szacunku i zaufaniu tych, którzy zbliżają się do Jezusa oraz oczekują od Niego pomocy i uzdrowienia. Wypowiadany za natchnieniem Ducha Świętego, tytuł ten wyraża uznanie Boskiego misterium Jezusa. W spotkaniu z Jezusem zmartwychwstałym staje się adoracją: „Pan mój i Bóg mój!” (J 20,28). Przybiera wtedy znamiona miłości i przywiązania, które pozostaną charakterystyczne dla tradycji chrześcijańskiej: „To jest Pan!” (J 21,7) (KKK 448).',
          '„Przypisując Jezusowi Boski tytuł Pana, pierwsze wyznania wiary Kościoła od początku stwierdzają, że moc, cześć i chwała należne Bogu Ojcu przysługują także Jezusowi, ponieważ istnieje On «w postaci Bożej» (Flp 2,6), a Ojciec potwierdził to panowanie Jezusa, wskrzeszając Go z martwych i wywyższając Go w swojej chwale.” (KKK 449)',
          '„Od początku historii chrześcijańskiej stwierdzenie panowania Jezusa nad światem i nad historią oznacza także uznanie, że człowiek nie może w sposób absolutny poddać swojej wolności osobistej żadnej władzy ziemskiej, ale wyłącznie Bogu Ojcu i Panu Jezusowi Chrystusowi: Cezar nie jest «Panem». «Kościół wierzy, że klucz, ośrodek i cel całej ludzkiej historii znajduje się w jego Panu i Nauczycielu».” (KKK 450)',
        ],
        tasks: [
          {
            id: 'tydzien-2-dzien-5-t1',
            label: 'Zapisz: 1 Tm 2,5-6',
            kind: 'write',
            reference: '1 Tm 2,5-6',
          },
          {
            id: 'tydzien-2-dzien-5-t2',
            label: 'Podziękuj i módl się tekstem: Mk 1,21-34',
            kind: 'pray',
            reference: 'Mk 1,21-34',
          },
        ],
      },
      {
        id: 'tydzien-2-dzien-6',
        number: 6,
        title: 'Duch Święty jest Twoim Doradcą',
        paragraphs: [
          'Dalej przeglądamy nasz rodzinny album. Natrafiamy na wyjątkowego „Gościa” – Ducha Świętego.',
          'Duch Święty na pozór mniej jest widoczny od Jezusa, ale w tej chwili najmocniej w Tobie działa. Jezus zapowiedział to.',
          'Ta trzecia Osoba Boża dokonała właśnie w Tobie cudu nowych, duchowych narodzin. „Duch Święty przez swoją łaskę pierwszy wzbudza naszą wiarę i udziela nowego życia, które polega na tym, abyśmy znali «jedynego prawdziwego Boga oraz Tego, którego posłał, Jezusa Chrystusa» (J 17,3). Jest On ostatni w objawieniu Osób Trójcy Świętej.” (KKK 684)',
          'Być może niewiele o Nim słyszałeś i niewiele rozumiałeś z Jego czynów, gdyż pracuje On wewnętrznie, w głębiach serca – niewidocznie, ale potężnie. Teraz przeżywamy Jego czas. Czas Jego działania. On przekonuje Cię, że trzeba zerwać z grzechem i wyznawać Jezusa. On przemieniając zapewnia, że warto iść za tym co najlepsze. Chce dla Ciebie życia tylko najwyższej jakości. Czasami będziesz jeszcze musiał walczyć ze swoją starą naturą, ale mieszkający w Tobie Duch Boży będzie Ci pomagał.',
          'Jeśli jesteśmy w komunii z Duchem Świętym, to On daje nam powrót do raju, otwiera nam bramy nieba i czyni nas przybranymi dziećmi Bożymi. Dzięki Niemu możemy z ufnością nazywać Boga naszym Ojcem. On daje nam uczestnictwo w łasce Chrystusa i sprawia, że stajemy się dziećmi światłości. On również jest zadatkiem przyszłej chwały (KKK 736).',
          'Twoim zadaniem jest posłuszeństwo. W miarę, jak będziesz z Nim współpracował, On będzie Cię uczył co trzeba robić, a co ważniejsze, będzie Ci dawał do tego siłę.',
        ],
        tasks: [
          { id: 'tydzien-2-dzien-6-t1', label: 'Zapisz: J 14,26', kind: 'write', reference: 'J 14,26' },
          {
            id: 'tydzien-2-dzien-6-t2',
            label: 'Módl się tekstem: Mk 1,35-39',
            kind: 'pray',
            reference: 'Mk 1,35-39',
          },
        ],
      },
      {
        id: 'tydzien-2-dzien-7',
        number: 7,
        title: 'Inni wierzący to siostry i bracia',
        paragraphs: [
          'To jest dopiero ciekawy obrazek. Kogo tutaj nie ma? Są desperaci i marnotrawne córki. Są pseudokibice i pankówy. Są złodzieje i narkomanki. Nauczycielki obok ślusarzy, kucharki obok górników, pielęgniarki obok biznesmenów. Inżynierowie tuż przy bezrobotnych. Są dewotki i łamiący się nastolatkowie. Rodziny i samotni. Kombinujący i niezaradni życiowo. Słowem, przekrój przez ludzkość wzdłuż i w poprzek. Ale to, co nas łączy, to wielkie i bezwarunkowe Boże przygarnięcie. Przebaczenie, które przekreśliło stare życie. Wyjątkowy dar miłości Bożej, który przyjęliśmy. Wszyscy jesteśmy adoptowanymi dziećmi Boga. Ta niesamowita łaska, niezasłużony wybór, wycisnął się na naszych sercach jak piętno. Drogocenne i nieścieralne - na zawsze.',
          'Jeżeli chcesz obejrzeć naszą historię, zobaczysz dużo grzechów, ale jeszcze więcej łaski. To, co dawne, minęło. Nie chcemy ukrywać, że były to ciemne karty naszego życia. Bardziej jednak liczy się to, co jest dziś: nasze zmaganie się o wytrwanie przy Jezusie, naszym jedynym Mistrzu.',
          'Nazywamy się „Kościołem”, tzn. „zwołaniem”, ponieważ Jezus nas zobaczył i zawołał. Ruszyliśmy za Nim. I tak zostało do dziś. Jezus jest ciągle w drodze, a my z Nim. Wiele razy nie nadążamy, ale wytężamy krok, by nie pozostać za bardzo w tyle. Chcąc nie chcąc, musieliśmy się polubić. Zaczęliśmy tu i tam nawet współpracować. Tak oto poznajemy się i budujemy przyjaźnie. Ciągle w drodze i ciągle przy głoszeniu Jezusa.',
          'Możesz i Ty się przyłączyć. Nie jesteśmy idealni, ale idealnie poznani przez Miłość. Nie jesteśmy doskonali, ale doskonale wiemy że siebie potrzebujemy. Nie jesteśmy samowystarczalni, ale przekonani, że wystarczy nam Jego łaski.',
          'Co do Ciebie należy? Bądź tolerancyjny – to najbardziej podstawowa forma akceptacji. Uznaj nowe życie, które nosi w sobie każdy nawrócony (przeczytaj 1 J 5,1).',
          'Tak powstaje kultura! Gdy szanujemy siebie wzajemnie i okazujemy wzajemne zainteresowanie. Następnie rodzi się życzliwość, sympatia i przyjaźń. Zasadą budowania wzajemnych relacji ostatecznie jest miłość. Bez niej wszystko więdnie i traci sens. Bez niej chrześcijaństwo przestaje być autentyczne. Powstaje prawdziwa wspólnota gdy widzimy w sobie nawzajem dzieci Boże.',
          'Jest wiele takich osób w Kościele, które bardzo pragną Twego szczęścia. Ich pragnienia są złączone z zamiarami Boga. Mówimy o nich „święci”. To ci, którzy wybielili swe słowa i czyny we krwi Chrystusa – Baranka. Modlą się dziś za Ciebie.',
        ],
        tasks: [
          {
            id: 'tydzien-2-dzien-7-t1',
            label: 'Przeczytaj: 1 J 5,1',
            kind: 'read',
            reference: '1 J 5,1',
          },
          { id: 'tydzien-2-dzien-7-t2', label: 'Zapisz: 1 J 4,20', kind: 'write', reference: '1 J 4,20' },
          { id: 'tydzien-2-dzien-7-t3', label: 'Zapisz: Kol 2,6-7', kind: 'write', reference: 'Kol 2,6-7' },
          {
            id: 'tydzien-2-dzien-7-t4',
            label: 'Módl się tekstem: Mk 1,40-45',
            kind: 'pray',
            reference: 'Mk 1,40-45',
          },
        ],
      },
    ],
  },
];
