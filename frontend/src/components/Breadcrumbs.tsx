import { useNavigationStore } from "../stores/navigationStore";

export function Breadcrumbs() {
  const { navigationStack, navigateToIndex } = useNavigationStore();

  return (
    <div className="mx-2 rounded-b-md border-x border-b bg-white px-5 py-3.5">
      <div className="flex items-center space-x-2 text-lg">
        {navigationStack.map((jurisdiccion, index) => (
          <div key={jurisdiccion.id} className="flex items-center">
            {index > 0 && <span className="mx-2 text-xl text-gray-400">/</span>}
            <button
              onClick={() => navigateToIndex(index)}
              className={`text-lg hover:text-blue-600 transition-colors ${
                index === navigationStack.length - 1
                  ? "font-semibold text-blue-600"
                  : "text-gray-600 hover:underline"
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
