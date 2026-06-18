# Бриф для LLM: восстановление сайта Synaptik Summer Day 2022

Нужно воссоздать внешний вид конференционного лендинга Synaptik Summer Day 2022 по архивным данным из этого пакета.

## Что найдено в Wayback

Основной URL: `https://synaptik.ru/ssd2022/`

Рабочие raw-ссылки без Wayback toolbar:

1. Главная, 16 августа 2022: https://web.archive.org/web/20220816061157id_/https://synaptik.ru/ssd2022/
2. Главная, 5 октября 2022: https://web.archive.org/web/20221005042650id_/https://synaptik.ru/ssd2022/
3. Памятка, 16 августа 2022: https://web.archive.org/web/20220816061030id_/https://synaptik.ru/ssd2022_pamyatka/
4. Памятка, 5 октября 2022: https://web.archive.org/web/20221005055115id_/https://synaptik.ru/ssd2022_pamyatka/

По CDX для `synaptik.ru/ssd2023*`, `synaptik.ru/*2023*` и широкому поиску по `ssd` на домене отдельных страниц конференции 2023 года не найдено. В архиве по этому домену видны только `ssd2022` и `ssd2022_pamyatka`.

## Локальные файлы

Лучше всего начать с:

1. `site/20221005042650-ssd2022/index.html` - главная страница.
2. `site/20221005055115-ssd2022-pamyatka/index.html` - памятка участника.
3. `source-html/ssd2022_20221005042650.raw.html` и `source-html/ssd2022_pamyatka_20221005055115.raw.html` - исходный HTML без переписывания.
4. `assets/` - доступные CSS/JS/SVG/часть изображений, скачанные из Wayback.
5. `manifest.json` - полный список найденных ассетов и отсутствующих файлов.

## Визуальный стиль по исходникам

- Конструктор: Flexbe. Верстка состоит из блоков `b_block`, `container-fluid`, `content-zone`, `elements-list`.
- Шрифт: Montserrat для заголовков, подзаголовков и основного текста.
- Первый экран: темный/контрастный hero с белым текстом, верхнее меню, кнопка регистрации, фоновое видео/изображение YouTube `Hq8jCl8_Rno`.
- Навигация главной: «Программа», «Спикеры», «Как добраться», «Стоимость», «FAQ».
- Контент главной: место проведения, программа, спикеры, дорога/карта, стоимость, FAQ, формы/модалки регистрации.
- Палитра: белый текст на темных/фото-фонах, черный/темный текст на светлых секциях, акцентные filled-кнопки Flexbe, квадратные/почти прямоугольные кнопки.
- Страница памятки: более утилитарная структура для участника, с тем же header/footer, контактами и блоками с важной информацией.

## Ограничения восстановления

Некоторые важные ассеты отсутствуют в Wayback:

- page-specific CSS `/_app/lp/1493692_1659011756.css` и `/_app/lp/1506719_1659155113.css`;
- многие изображения `/img/256...`, `/img/257...`, `/img/258...`.

Поэтому при точном редизайне используй HTML-структуру, inline styles, доступные общие CSS Flexbe и текстовый контент как основной источник, а недостающие фоновые фото/аватары можно заменить близкими по функции изображениями.

## Проверенные CDX-записи страниц

```json
[
  {
    "timestamp": "20220816061157",
    "original": "https://synaptik.ru/ssd2022/",
    "statuscode": "200",
    "mimetype": "text/html",
    "digest": "OMTHG76QEL62C6X6LTD35NFDEDVDNNSK",
    "length": "33705"
  },
  {
    "timestamp": "20221005042650",
    "original": "https://synaptik.ru/ssd2022/",
    "statuscode": "200",
    "mimetype": "text/html",
    "digest": "CO6W3V2CHP4D4BWJW3QMVRTRGOBY52R5",
    "length": "33860"
  },
  {
    "timestamp": "20251109092723",
    "original": "https://synaptik.ru/ssd2022/",
    "statuscode": "308",
    "mimetype": "unk",
    "digest": "4XCTFG7BIGNFRSZ5GDYIJC2LMNHJQTB6",
    "length": "327"
  },
  {
    "timestamp": "20251109111627",
    "original": "https://synaptik.ru/ssd2022",
    "statuscode": "404",
    "mimetype": "text/html",
    "digest": "7QEK4GOLQEL77LF3D2DZVIXXSDMIVZKC",
    "length": "6368"
  },
  {
    "timestamp": "20220816061030",
    "original": "https://synaptik.ru/ssd2022_pamyatka/",
    "statuscode": "200",
    "mimetype": "text/html",
    "digest": "WM7XUT3PG5VE2AWBFTNTVODSGAEXCSDO",
    "length": "18818"
  },
  {
    "timestamp": "20221005055115",
    "original": "https://synaptik.ru/ssd2022_pamyatka/",
    "statuscode": "200",
    "mimetype": "text/html",
    "digest": "NHQQII5UXV5CKDZDOAE2NCF4PTXHCQ7M",
    "length": "18917"
  }
]
```
