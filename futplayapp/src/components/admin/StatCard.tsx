type StatCardProps = {
  title: string;
  value: string;
  color?: string;
};

export default function StatCard({ title, value, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
      
      {/* Línea de color */}
      <div className={`w-1 h-12 rounded ${color || "bg-blue-500"}`} />

      {/* Texto */}
      <div>
        <p className="text-xs text-gray-500 uppercase">{title}</p>
        <h2 className="text-xl font-bold">{value}</h2>
      </div>

    </div>
  );
}