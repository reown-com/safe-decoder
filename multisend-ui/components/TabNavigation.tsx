import React from 'react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex border-b mb-6">
      <button
        className={`py-2 px-4 font-medium ${
          activeTab === 'list'
            ? 'border-b-2 border-black text-black'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onTabChange('list')}
      >
        Transaction List
      </button>
      <button
        className={`py-2 px-4 font-medium ${
          activeTab === 'json'
            ? 'border-b-2 border-black text-black'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onTabChange('json')}
      >
        JSON Data
      </button>
    </div>
  );
};

export default TabNavigation; 