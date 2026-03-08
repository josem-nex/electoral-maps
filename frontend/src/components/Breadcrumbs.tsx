import { useNavigationStore } from '../stores/navigationStore';

export function Breadcrumbs() {
  const { navigationStack, navigateToIndex } = useNavigationStore();
  
  return (
    <div className="bg-white shadow-sm border-b px-4 py-2">
      <div className="flex items-center space-x-2 text-sm">
        {navigationStack.map((jurisdiccion, index) => (
          <div key={jurisdiccion.id} className="flex items-center">
            {index > 0 && <span className="text-gray-400 mx-2">/</span>}
            <button
              onClick={() => navigateToIndex(index)}
              className={`hover:text-blue-600 transition-colors ${
                index === navigationStack.length - 1
                  ? 'font-semibold text-blue-600'
                  : 'text-gray-600 hover:underline'
              }`}
            >
              {jurisdiccion.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
