const MaintenancePage = ({ message }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-xl text-center">
        {/* Icon Animasi */}
        <div className="text-8xl mb-6 animate-bounce">🔧</div>

        {/* Judul */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Sedang Maintenance
        </h1>

        {/* Pesan */}
        <p className="text-gray-600 text-lg mb-6 leading-relaxed">{message}</p>

        {/* Footer */}
        <p className="text-gray-500 text-sm mt-6">
          Mohon maaf atas ketidaknyamanannya 🙏
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;
