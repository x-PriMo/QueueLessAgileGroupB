import { Link } from 'react-router-dom'
import { 
  ClockIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'

const HomePage = () => {
  const features = [
    {
      icon: ClockIcon,
      title: 'Oszczędność czasu',
      description: 'Zarezerwuj miejsce w kolejce online i uniknij długiego oczekiwania'
    },
    {
      icon: UserGroupIcon,
      title: 'Zarządzanie kolejkami',
      description: 'Efektywne zarządzanie kolejkami dla firm i instytucji'
    },
    {
      icon: ChartBarIcon,
      title: 'Analityka',
      description: 'Szczegółowe raporty i statystyki dotyczące kolejek'
    },
    {
      icon: CheckCircleIcon,
      title: 'Łatwość użycia',
      description: 'Intuicyjny interfejs dostępny na wszystkich urządzeniach'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Inteligentne zarządzanie kolejkami
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Zarezerwuj miejsce w kolejce online i oszczędź swój czas
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/companies"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Znajdź firmy
              </Link>
              <Link
                to="/auth/register"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors"
              >
                Załóż konto
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Dlaczego QueueLess?
            </h2>
            <p className="text-xl text-gray-600">
              Nowoczesne rozwiązanie dla firm i klientów
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Gotowy na start?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Dołącz do tysięcy zadowolonych użytkowników
          </p>
          <Link
            to="/auth/register"
            className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
          >
            Rozpocznij za darmo
          </Link>
        </div>
      </section>
    </div>
  )
}

export default HomePage
