import { useState, useEffect } from 'react'
import { 
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { api } from '../../lib/api'
import { formatDateTime, formatDuration } from '../../lib/utils'
import toast from 'react-hot-toast'

interface Reservation {
  id: string
  queueId: string
  queueName: string
  companyId: string
  companyName: string
  companyAddress: string
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  position: number
  estimatedWaitTime: number
  createdAt: string
  updatedAt: string
  reservationTime?: string
}

const ReservationsPage = () => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reservations')
      setReservations(response.data)
    } catch (error) {
      toast.error('Błąd podczas pobierania rezerwacji')
    } finally {
      setLoading(false)
    }
  }

  const cancelReservation = async (reservationId: string) => {
    try {
      setCancellingId(reservationId)
      await api.patch(`/reservations/${reservationId}/cancel`)
      
      setReservations(prev => 
        prev.map(reservation => 
          reservation.id === reservationId 
            ? { ...reservation, status: 'CANCELLED' as const }
            : reservation
        )
      )
      
      toast.success('Rezerwacja została anulowana')
    } catch (error) {
      toast.error('Błąd podczas anulowania rezerwacji')
    } finally {
      setCancellingId(null)
    }
  }

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: Reservation['status']) => {
    switch (status) {
      case 'WAITING':
        return 'Oczekuje'
      case 'IN_PROGRESS':
        return 'W trakcie'
      case 'COMPLETED':
        return 'Zakończona'
      case 'CANCELLED':
        return 'Anulowana'
      default:
        return status
    }
  }

  const getStatusIcon = (status: Reservation['status']) => {
    switch (status) {
      case 'WAITING':
        return <ClockIcon className="h-4 w-4" />
      case 'IN_PROGRESS':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'COMPLETED':
        return <CheckIcon className="h-4 w-4" />
      case 'CANCELLED':
        return <XMarkIcon className="h-4 w-4" />
      default:
        return null
    }
  }

  const filteredReservations = reservations.filter(reservation => {
    if (filter === 'all') return true
    if (filter === 'active') return ['WAITING', 'IN_PROGRESS'].includes(reservation.status)
    if (filter === 'completed') return reservation.status === 'COMPLETED'
    if (filter === 'cancelled') return reservation.status === 'CANCELLED'
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Moje rezerwacje</h1>
        <p className="mt-2 text-gray-600">
          Zarządzaj swoimi rezerwacjami w kolejkach
        </p>
      </div>

      {/* Filtry */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Wszystkie' },
            { key: 'active', label: 'Aktywne' },
            { key: 'completed', label: 'Zakończone' },
            { key: 'cancelled', label: 'Anulowane' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista rezerwacji */}
      {filteredReservations.length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Brak rezerwacji</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' 
              ? 'Nie masz jeszcze żadnych rezerwacji.'
              : `Nie masz rezerwacji w kategorii "${filter === 'active' ? 'aktywne' : filter === 'completed' ? 'zakończone' : 'anulowane'}".`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {reservation.companyName}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                      {getStatusIcon(reservation.status)}
                      {getStatusText(reservation.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      <span>{reservation.companyAddress}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Kolejka: {reservation.queueName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      <span>Utworzona: {formatDateTime(reservation.createdAt)}</span>
                    </div>
                    
                    {reservation.status === 'WAITING' && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Pozycja w kolejce: {reservation.position}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Szacowany czas oczekiwania: {formatDuration(reservation.estimatedWaitTime)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {reservation.status === 'WAITING' && (
                  <button
                    onClick={() => cancelReservation(reservation.id)}
                    disabled={cancellingId === reservation.id}
                    className="ml-4 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancellingId === reservation.id ? 'Anulowanie...' : 'Anuluj'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ReservationsPage
