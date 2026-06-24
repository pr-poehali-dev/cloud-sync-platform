export type FieldType = 'text' | 'multi-text' | 'textarea' | 'checkbox' | 'radio' | 'cases' | 'photos' | 'date'

export interface FormField {
  id: string
  label: string
  type: FieldType
  placeholder?: string
  hint?: string
  options?: string[]
  required?: boolean
  allowCustom?: boolean
  noCustom?: boolean
}

export interface FormSection {
  id: string
  number: number
  title: string
  intro?: string
  fields: FormField[]
}

export const brand = {
  badgeLeft: 'Лидер Франшиз',
  badgeRight: 'Лидер ИИ',
  eyebrow: 'Анкета специалиста',
  heroTitle: 'Каталог ИИ-специалистов для рынка франчайзинга',
  heroSubtitle:
    'Заполните анкету — мы создадим карточку в каталоге. Время заполнения: 10–15 минут. Все поля обязательны, если не отмечено иное.',
  footerTelegram: '@annakharitonova',
  footerEmail: 'dolzhenkova@leader-fr.ru',
  footerNote: 'Мы свяжемся в течение 2 рабочих дней · Leader-Franchise.ru · ai.leader-fr.ru',
}

export const formSections: FormSection[] = [
  {
    id: 'about',
    number: 1,
    title: 'О ВАС',
    intro: 'Кто вы — специалист или компания?',
    fields: [
      {
        id: 'type',
        label: 'Тип',
        type: 'radio',
        options: ['Специалист-фрилансер', 'Агентство / команда'],
        required: true,
        allowCustom: true,
      },
      { id: 'name', label: 'Имя и фамилия (для фрилансера) / Название компании', type: 'text', required: true },
      { id: 'city', label: 'Город', type: 'text', required: true },
      { id: 'site', label: 'Сайт или портфолио (если есть)', type: 'multi-text', placeholder: 'https://' },
      { id: 'telegram', label: 'Telegram (основной контакт)', type: 'text', required: true, placeholder: '@username' },
      { id: 'email', label: 'Email', type: 'text', required: true, placeholder: 'mail@example.com' },
    ],
  },
  {
    id: 'specialization',
    number: 2,
    title: 'СПЕЦИАЛИЗАЦИЯ',
    intro: 'Выберите основное направление работы (1–3 категории)',
    fields: [
      {
        id: 'categories',
        label: 'Категория',
        type: 'checkbox',
        allowCustom: true,
        options: [
          'Внедрение ИИ в бизнес',
          'Чат-боты и ассистенты',
          'ИИ-агенты и автоматизация',
          'Обучение команды',
          'Маркетинг и контент',
          'Аналитика и ML',
          'HR и рекрутинг',
          'Разработка и интеграции',
        ],
      },
      {
        id: 'niches',
        label: 'С какими нишами работаете? (если не универсально)',
        type: 'checkbox',
        allowCustom: true,
        options: ['Франчайзинг', 'Ритейл', 'Медицина', 'HoReCa', 'HR / рекрутинг', 'Финансы', 'Производство', 'Другое'],
      },
      {
        id: 'tools',
        label: 'Инструменты и технологии, с которыми работаете',
        type: 'textarea',
        placeholder: 'Например: ChatGPT API, n8n, Telegram Bot API, Python, YandexGPT, Midjourney, Make и др.',
      },
    ],
  },
  {
    id: 'card',
    number: 3,
    title: 'ОПИСАНИЕ ДЛЯ КАРТОЧКИ',
    intro: 'Это текст, который увидят заказчики в каталоге.',
    fields: [
      {
        id: 'pitch',
        label: 'Кто вы и чем помогаете клиентам? (2–4 предложения)',
        type: 'textarea',
        hint: 'Напишите просто — что вы делаете, для кого, какой результат получает клиент. Без технического жаргона.',
        required: true,
      },
    ],
  },
  {
    id: 'experience',
    number: 4,
    title: 'ОПЫТ И КЕЙСЫ',
    intro: 'Реальные результаты — главное для верификации.',
    fields: [
      { id: 'projectsCount', label: 'Сколько проектов реализовано', type: 'text', required: true },
      {
        id: 'cases',
        label: 'Кейсы',
        type: 'cases',
        hint: 'Кейс 1 — обязательно. Остальные — по желанию, поднимают карточку в рейтинге.',
      },
    ],
  },
  {
    id: 'terms',
    number: 5,
    title: 'УСЛОВИЯ РАБОТЫ',
    intro: 'Что увидит клиент в карточке.',
    fields: [
      {
        id: 'pricingType',
        label: 'Стоимость',
        type: 'checkbox',
        allowCustom: true,
        options: ['Фиксированная сумма проекта', 'Почасовая оплата', 'По запросу / индивидуально'],
      },
      {
        id: 'priceFrom',
        label: 'Стоимость от (укажите в рублях)',
        type: 'text',
        placeholder: 'Например: от 30 000 ₽ за проект / 5 000 ₽/час',
      },
      {
        id: 'workFormat',
        label: 'Формат работы',
        type: 'checkbox',
        allowCustom: true,
        options: ['Удалённо', 'Выезд к клиенту', 'Онлайн + выезд'],
      },
      {
        id: 'terms',
        label: 'Типичные сроки проекта',
        type: 'text',
        placeholder: 'Например: 2–4 недели на чат-бот, 2–3 месяца на внедрение',
      },
    ],
  },
  {
    id: 'materials',
    number: 6,
    title: 'ФОТО И МАТЕРИАЛЫ',
    intro: 'Необязательно, но значительно увеличивает доверие к карточке.',
    fields: [
      { id: 'photo', label: 'Ссылка на фото (квадратное, от 400×400)', type: 'text', placeholder: 'Необязательно — Google Drive, Яндекс.Диск или прямая ссылка' },
      { id: 'portfolio', label: 'Портфолио / кейсы онлайн', type: 'text', placeholder: 'Необязательно — ссылка на сайт, Notion, Tilda и др.' },
      { id: 'reviews', label: 'Ссылка на отзывы', type: 'text', placeholder: 'Необязательно — Яндекс, 2ГИС, Авито, Google и др.' },
      {
        id: 'portfolioPhotos',
        label: 'Фото из портфолио',
        type: 'photos',
        hint: 'Скриншоты результатов, интерфейсов, кейсов — что угодно. Необязательно, но поднимает карточку в рейтинге.',
      },
    ],
  },
  {
    id: 'agreement',
    number: 7,
    title: 'СОГЛАСОВАНИЕ',
    intro:
      'Заполняя анкету, вы соглашаетесь на публикацию информации в каталоге «Лидер ИИ» / «Лидер Франшиз» и подтверждаете, что все данные достоверны.',
    fields: [
      { id: 'agree', label: 'Согласен(а) с условиями размещения', type: 'checkbox', options: ['Согласен(а) с условиями размещения'], required: true, noCustom: true },
      { id: 'date', label: 'Дата', type: 'date' },
    ],
  },
]

export interface CaseItem {
  client: string
  task: string
  done: string
  result: string
  contact: string
}

export const emptyCase = (): CaseItem => ({ client: '', task: '', done: '', result: '', contact: '' })