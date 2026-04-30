interface PlaceholderViewProps {
  title: string;
  description?: string;
}

export function PlaceholderView({ title, description }: PlaceholderViewProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          En construcción
        </div>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        )}
      </div>
    </div>
  );
}
