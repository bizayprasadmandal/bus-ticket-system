import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'ne' : 'en')}
      className="px-2.5 py-1 text-xs font-bold rounded-full border border-gray-200 hover:border-[#d84e55] transition-colors text-gray-600 hover:text-[#d84e55]"
      title={locale === 'en' ? 'नेपालीमा स्विच गर्नुहोस्' : 'Switch to English'}
    >
      {locale === 'en' ? 'ने' : 'EN'}
    </button>
  );
}
