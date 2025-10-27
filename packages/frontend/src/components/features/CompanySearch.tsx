import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  ClockIcon,
  GlobeAltIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from 'react-hot-toast'
import QueueMetrics from '../components/ui/QueueMetrics'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

interface Company {
  id: string
  name: string
  description: string
  address: string
  phone: string
  contactEmail?: string
  email?: string
  website?: string
  openingHours: string
  category: string
  averageWaitTime: number
  currentQueueLength: number
  logoUrl?: string | null
}

interface Queue {
  id: string
  name: string
  description: string
  isActive: boolean
  maxCapacity: number
  currentLength: number
  averageWaitTime: number
}

const CompanyDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  
  const [company, setCompany] = useState<Company | null>(null)
  const [queues, setQueues] = useState<Queue[]>([])
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState<string | null>(null)

  // New reservation modal state
  const [isReservationOpen, setIsReservationOpen] = useState(false)
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState<number>(60)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedStartTime, setSelectedStartTime] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false)

  useEffect(() => {
    if (id) {
      fetchCompanyDetails()
    }
  }, [id])

  const fetchCompanyDetails = async () => {
    try {
      const [companyResponse, queueStatusResponse] = await Promise.all([
        api.get(`/companies/${id}`),
        api.get(`/queue/company/${id}`)
      ])
      
      setCompany(companyResponse.data.company)
      const { queueEntries, totalWaiting, averageWaitTime } = queueStatusResponse.data
      setQueues(queueEntries || [])
      setCompany(prev => prev ? { ...prev, currentQueueLength: totalWaiting, averageWaitTime } : prev)
    } catch (error) {
      console.error('Błąd pobierania danych firmy:', error)
      toast.error('Nie udało się pobrać danych firmy')
      navigate('/companies')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async (d: string, dur: number) => {
    if (!id) return
    try {
      setLoadingAvailability(true)
      const res = await api.get(`/reservations/availability`, {
        params: {
          companyId: id,
          date: d,
          duration: dur,
        },
      })
      setAvailableSlots(res.data.availableSlots || [])
    } catch (error) {
      console.error('Błąd pobierania dostępności:', error)
      toast.error('Nie udało się pobrać dostępności')
      setAvailableSlots([])
    } finally {
      setLoadingAvailability(false)
    }
  }

  const openReservationModal = async (queueId: string) => {
    if (!isAuthenticated) {
      toast.error('Musisz być zalogowany, aby dokonać rezerwacji')
      navigate('/login')
      return
    }
    setSelectedQueueId(queueId)
    setIsReservationOpen(true)
    await fetchAvailability(date, duration)
  }

  const computeEndTime = (start: string, dur: number) => {
    const [h, m] = start.split(':').map(Number)
    const total = h * 60 + m + dur
    const hh = Math.floor(total / 60) % 24
    const mm = total % 60
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(hh)}:${pad(mm)}`
  }

  const submitReservation = async () => {
    if (!selectedQueueId || !id || !selectedStartTime) {
      toast.error('Wybierz termin rezerwacji')
      return
    }
    try {
      setReserving(selectedQueueId)
      const customerName = (user?.displayName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email) as string
      const payload = {
        companyId: id,
        customerName,
        customerEmail: user?.email,
        customerPhone: phone || user?.phone,
        date,
        duration,
        startTime: selectedStartTime,
        endTime: computeEndTime(selectedStartTime, duration),
        notes,
      }
      await api.post(`/reservations`, payload)
      toast.success('Rezerwacja została utworzona!')
      setIsReservationOpen(false)
      navigate('/dashboard/reservations')
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Błąd podczas tworzenia rezerwacji'
      toast.error(message)
    } finally {
      setReserving(null)
    }
  }

  const handleReservation = async (queueId: string) => {
    await openReservationModal(queueId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Firma nie została znaleziona</h2>
          <p className="text-gray-600 mb-4">Sprawdź adres URL lub wróć do listy firm</p>
          <button
            onClick={() => navigate('/companies')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Powrót do listy firm
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Company Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt={company.name} className="w-12 h-12 rounded-full mr-4 object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 mr-4" />
                )}
                <h1 className="text-3xl font-bold text-gray-900 mr-4">
                  {company.name}
                </h1>
                <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                  {company.category}
                </span>
              </div>
              
              <p className="text-gray-600 mb-6">
                {company.description}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center text-gray-600">
                  <MapPinIcon className="w-5 h-5 mr-3" />
                  {company.address}
                </div>
                <div className="flex items-center text-gray-600">
                  <PhoneIcon className="w-5 h-5 mr-3" />
                  {company.phone}
                </div>
                <div className="flex items-center text-gray-600">
                  <EnvelopeIcon className="w-5 h-5 mr-3" />
                  {company.contactEmail || company.email}
                </div>
                <div className="flex items-center text-gray-600">
                  <ClockIcon className="w-5 h-5 mr-3" />
                  {company.openingHours}
                </div>
                {company.website && (
                  <div className="flex items-center text-gray-600">
                    <GlobeAltIcon className="w-5 h-5 mr-3" />
                    <a 
                      href={company.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {company.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 lg:mt-0 lg:ml-8">
              <QueueMetrics
                currentLength={company.currentQueueLength}
                averageWaitTime={company.averageWaitTime}
                variant="card"
              />
            </div>
          </div>
        </div>

        {/* Queues Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Dostępne kolejki
          </h2>
          
          {queues.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Brak dostępnych kolejek w tej firmie
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {queues.map(queue => (
                <div key={queue.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {queue.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      queue.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {queue.isActive ? 'Aktywna' : 'Nieaktywna'}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">
                    {queue.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Kolejka:</span>
                      <span className="font-medium">
                        {queue.currentLength}/{queue.maxCapacity}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Czas oczekiwania:</span>
                      <span className="font-medium">~{queue.averageWaitTime} min</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleReservation(queue.id)}
                    disabled={!queue.isActive || queue.currentLength >= queue.maxCapacity || reserving === queue.id}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      queue.isActive && queue.currentLength < queue.maxCapacity
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {reserving === queue.id ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Rezerwuję...</span>
                      </div>
                    ) : !queue.isActive ? (
                      'Kolejka nieaktywna'
                    ) : queue.currentLength >= queue.maxCapacity ? (
                      'Kolejka pełna'
                    ) : (
                      'Zarezerwuj miejsce'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reservation Modal */}
      <Modal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} title="Nowa rezerwacja" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Data"
              value={date}
              onChange={(e) => {
                const d = e.target.value
                setDate(d)
                fetchAvailability(d, duration)
              }}
            />
            <Input
              type="number"
              min={15}
              step={15}
              label="Czas trwania (min)"
              value={duration}
              onChange={(e) => {
                const dur = parseInt(e.target.value || '60', 10)
                setDuration(dur)
                fetchAvailability(date, dur)
              }}
            />
          </div>

          <Input
            type="tel"
            label="Telefon kontaktowy"
            placeholder="Opcjonalnie"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            type="text"
            label="Uwagi"
            placeholder="Opcjonalnie"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Dostępne godziny</p>
            {loadingAvailability ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <LoadingSpinner size="sm" />
                <span>Ładowanie dostępności...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-gray-500">Brak wolnych terminów dla wybranych parametrów.</p>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                      selectedStartTime === slot
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedStartTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsReservationOpen(false)}>Anuluj</Button>
            <Button onClick={submitReservation} disabled={!selectedStartTime} loading={!!reserving}>Potwierdź rezerwację</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CompanyDetailsPage
