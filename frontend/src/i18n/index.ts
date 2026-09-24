export type Locale = 'en' | 'ne';

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.search': 'Search Buses',
    'nav.bookings': 'My Bookings',
    'nav.wallet': 'Wallet',
    'nav.reviews': 'Reviews',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'common.loading': 'Loading...',
    'common.search': 'Search',
    'common.book': 'Book Now',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.from': 'From',
    'common.to': 'To',
    'common.date': 'Date',
    'common.seats': 'Seats',
    'common.fare': 'Fare',
    'common.total': 'Total',
    'common.status': 'Status',
    'common.noResults': 'No results found',
    'home.title': 'Gadi Ticket',
    'home.subtitle': 'Your trusted bus booking partner',
    'home.searchPlaceholder': 'Where are you going?',
    'search.title': 'Search Results',
    'search.noBuses': 'No buses found for this route',
    'booking.title': 'Book Your Ticket',
    'booking.passengers': 'Passengers',
    'booking.payment': 'Payment',
    'booking.confirmed': 'Booking Confirmed!',
    'booking.pnr': 'PNR',
  },
  ne: {
    'nav.home': 'होम',
    'nav.search': 'बस खोज्नुहोस्',
    'nav.bookings': 'मेरो बुकिङ',
    'nav.wallet': 'वालेट',
    'nav.reviews': 'समीक्षा',
    'nav.profile': 'प्रोफाइल',
    'nav.logout': 'लगआउट',
    'common.loading': 'लोड हुँदैछ...',
    'common.search': 'खोज्नुहोस्',
    'common.book': 'अहिले बुक गर्नुहोस्',
    'common.cancel': 'रद्द गर्नुहोस्',
    'common.save': 'सेभ गर्नुहोस्',
    'common.confirm': 'पुष्टि गर्नुहोस्',
    'common.back': 'पछाडि',
    'common.next': 'अर्को',
    'common.from': 'बाट',
    'common.to': 'तर्फ',
    'common.date': 'मिति',
    'common.seats': 'सिट',
    'common.fare': 'भाडा',
    'common.total': 'जम्मा',
    'common.status': 'स्थिति',
    'common.noResults': 'कुनै नतिजा भेटिएन',
    'home.title': 'समय डिलक्स',
    'home.subtitle': 'तपाईंको विश्वसनीय बस बुकिङ साथी',
    'home.searchPlaceholder': 'तपाईं कहाँ जानुहुन्छ?',
    'search.title': 'खोज नतिजा',
    'search.noBuses': 'यस मार्गमा कुनै बस भेटिएन',
    'booking.title': 'आफ्नो टिकट बुक गर्नुहोस्',
    'booking.passengers': 'यात्रुहरू',
    'booking.payment': 'भुक्तानी',
    'booking.confirmed': 'बुकिङ पक्का भयो!',
    'booking.pnr': 'PNR',
  },
};

let currentLocale: Locale = (localStorage.getItem('locale') as Locale) || 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
  localStorage.setItem('locale', locale);
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string): string {
  return (translations[currentLocale] as Record<string, string>)[key] || key;
}
