export default function EmptyState({ icon = '📚', title, message, action }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">{message}</p>
      {action && action}
    </div>
  );
}
