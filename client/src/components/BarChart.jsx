export default function BarChart({ data, title, height = 200 }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {title && <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>}
      <div className="flex items-end gap-3" style={{ height }}>
        {data.map((item, i) => {
          const pct = (item.value / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-xs font-medium text-gray-600">{item.value}</span>
              <div
                className="w-full bg-church-500 rounded-t transition-all duration-500 hover:bg-church-600 cursor-pointer relative group"
                style={{ height: `${Math.max(pct, 2)}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                  {item.label}: {item.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2">
        {data.map((item, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-xs text-gray-500 truncate block">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
