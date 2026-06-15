import Footer from "../../../../components/landingPage/Footer";

export const metadata = {
  title: "Nuestros Amigos | Futplay",
  description: "Empresas y organizaciones que confían en Futplay.",
};

const friends = [
  { name: "Amigo 1", description: "Próximamente..." },
  { name: "Amigo 2", description: "Próximamente..." },
  { name: "Amigo 3", description: "Próximamente..." },
];

export default function FriendsPage() {
  return (
    <main className="bg-white min-h-screen font-sans">
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <span className="text-[#f59e0b] font-bold tracking-wider uppercase text-sm">
            Colaboradores
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-[#002a58] leading-tight mt-4">
            Nuestros Amigos
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mt-4">
            Empresas e instituciones que nos acompañan en este camino.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            {friends.map((friend) => (
              <div
                key={friend.name}
                className="border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center text-gray-400 text-2xl font-bold">
                  ?
                </div>
                <h3 className="text-lg font-bold text-[#002a58]">{friend.name}</h3>
                <p className="text-gray-500 text-sm mt-2">{friend.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
