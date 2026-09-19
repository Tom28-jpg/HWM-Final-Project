import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/languagecontext';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Globe className="h-5 w-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {language === 'en' ? 'English' : language === 'ta' ? 'தமிழ்' : 'हिंदी'}
        </span>
      </button>

      <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <button
          onClick={() => setLanguage('en')}
          className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors rounded-t-lg ${
            language === 'en' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage('ta')}
          className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
            language === 'ta' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
          }`}
        >
          தமிழ் (Tamil)
        </button>
        <button
          onClick={() => setLanguage('hi')}
          className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors rounded-b-lg ${
            language === 'hi' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
          }`}
        >
          हिंदी (Hindi)
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector;
