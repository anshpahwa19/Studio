'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Receipt,
  FileText,
  UserCheck,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from 'date-fns';
import toast from 'react-hot-toast';

export default function AppointmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [staffFilter, setStaffFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Master Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);

  // Booking Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Details Modal
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [apptDate, setApptDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [apptStartTime, setApptStartTime] = useState('10:00');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [apptNotes, setApptNotes] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);

  // Check URL query for action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setBookingModalOpen(true);
    }
  }, [searchParams]);

  // Fetch Master Data
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [custRes, staffRes, svcRes] = await Promise.all([
          fetch('/api/customers?limit=100').then((r) => r.json()),
          fetch('/api/staff').then((r) => r.json()),
          fetch('/api/services').then((r) => r.json()),
        ]);

        if (custRes.success) setCustomers(custRes.data);
        if (staffRes.success) setStaffList(staffRes.data);
        if (svcRes.success) setServicesList(svcRes.data);
      } catch (err) {
        console.error('Error loading master data:', err);
      }
    }
    loadMasterData();
  }, []);

  // Fetch Appointments
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = `/api/appointments?staffId=${staffFilter}&status=${statusFilter}`;

      if (view === 'day') {
        url += `&date=${format(currentDate, 'yyyy-MM-dd')}`;
      } else if (view === 'week') {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        url += `&startDate=${format(start, 'yyyy-MM-dd')}&endDate=${format(end, 'yyyy-MM-dd')}`;
      } else {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        url += `&startDate=${format(start, 'yyyy-MM-dd')}&endDate=${format(end, 'yyyy-MM-dd')}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setAppointments(json.data);
      }
    } catch (err) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [view, currentDate, staffFilter, statusFilter]);

  // Navigate Calendar
  const handlePrev = () => {
    if (view === 'day') setCurrentDate((d) => subDays(d, 1));
    else if (view === 'week') setCurrentDate((d) => subDays(d, 7));
    else setCurrentDate((d) => subDays(d, 30));
  };

  const handleNext = () => {
    if (view === 'day') setCurrentDate((d) => addDays(d, 1));
    else if (view === 'week') setCurrentDate((d) => addDays(d, 7));
    else setCurrentDate((d) => addDays(d, 30));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Service toggle
  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter((s) => s !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const [serviceSearch, setServiceSearch] = useState('');

  // Searchable Options
  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: c.phone,
      badge: c.visitCount > 0 ? `${c.visitCount} visits` : 'New Client',
    }));
  }, [customers]);

  const staffOptions = useMemo(() => {
    return staffList.map((s) => ({
      value: s.id,
      label: s.name,
      sublabel: s.role,
      badge: s.role,
    }));
  }, [staffList]);

  const filteredServicesList = useMemo(() => {
    if (!serviceSearch.trim()) return servicesList;
    const q = serviceSearch.toLowerCase().trim();
    return servicesList.filter(
      (svc) =>
        svc.name.toLowerCase().includes(q) ||
        (svc.category && svc.category.name && svc.category.name.toLowerCase().includes(q))
    );
  }, [servicesList, serviceSearch]);

  // Calculate calculated duration & estimated price
  const selectedServiceObjects = servicesList.filter((s) =>
    selectedServices.includes(s.id)
  );
  const totalDuration = selectedServiceObjects.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = selectedServiceObjects.reduce((sum, s) => sum + s.price, 0);

  // Handle Create Appointment
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServices.length) {
      toast.error('Please select at least one service');
      return;
    }

    setSubmitting(true);
    try {
      let finalCustomerId = selectedCustomer;

      // Create new customer if in new customer mode
      if (newCustomerMode) {
        if (!newCustName || !newCustPhone) {
          toast.error('Please enter customer name and phone');
          setSubmitting(false);
          return;
        }

        const createCustRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCustName, phone: newCustPhone }),
        });
        const custJson = await createCustRes.json();
        if (!custJson.success) {
          toast.error(custJson.error || 'Failed to create customer');
          setSubmitting(false);
          return;
        }
        finalCustomerId = custJson.data.id;
        // Add to customer list
        setCustomers((prev) => [custJson.data, ...prev]);
      }

      if (!finalCustomerId) {
        toast.error('Please select or create a customer');
        setSubmitting(false);
        return;
      }

      if (!selectedStaff) {
        toast.error('Please select a staff member');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: finalCustomerId,
          staffId: selectedStaff,
          date: apptDate,
          startTime: apptStartTime,
          serviceIds: selectedServices,
          notes: apptNotes,
          isWalkIn,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Appointment scheduled successfully!');
        setBookingModalOpen(false);
        // Reset form
        setSelectedCustomer('');
        setNewCustomerMode(false);
        setNewCustName('');
        setNewCustPhone('');
        setSelectedServices([]);
        setApptNotes('');
        setIsWalkIn(false);
        fetchAppointments();
      } else {
        toast.error(json.error || 'Conflict or scheduling error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save appointment');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change
  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Status updated to ${newStatus}`);
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
        );
        if (selectedAppt && selectedAppt.id === appointmentId) {
          setSelectedAppt({ ...selectedAppt, status: newStatus });
        }
      } else {
        toast.error(json.error || 'Failed to update status');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Appointment cancelled');
        fetchAppointments();
        setDetailsModalOpen(false);
      }
    } catch (err) {
      toast.error('Failed to cancel appointment');
    }
  };

  // Convert to Bill (POS)
  const handleConvertToBill = (appt: any) => {
    router.push(
      `/billing?action=new&customerId=${appt.customerId}&appointmentId=${appt.id}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Appointments & Roster
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Real-time scheduling, double-booking protection and check-ins
          </p>
        </div>

        <Button
          onClick={() => setBookingModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-sm font-semibold"
        >
          Book Appointment
        </Button>
      </div>

      {/* Control Bar: Date Navigator, View Switcher & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200/60">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-white rounded-lg text-stone-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-white rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-white rounded-lg text-stone-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-stone-900 pl-2">
            {view === 'day' && format(currentDate, 'EEEE, dd MMMM yyyy')}
            {view === 'week' &&
              `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM')} - ${format(
                endOfWeek(currentDate, { weekStartsOn: 1 }),
                'dd MMM yyyy'
              )}`}
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
          </h3>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher */}
          <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200/60 text-xs font-medium">
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                view === 'day'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                view === 'week'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                view === 'month'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Month
            </button>
          </div>

          {/* Staff Filter */}
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          >
            <option value="all">All Stylists / Staff</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          >
            <option value="all">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="CheckedIn">Checked In</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="NoShow">No Show</option>
          </select>
        </div>
      </div>

      {/* Main Appointment Board / Timeline */}
      {loading ? (
        <div className="h-96 bg-white rounded-2xl border border-stone-200/80 flex flex-col items-center justify-center gap-2">
          <Spinner size="md" />
          <p className="text-xs text-stone-400">Loading schedule...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center mx-auto mb-3 border border-purple-100">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-stone-900 mb-1">
            No Appointments Found
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mb-5">
            There are no appointments scheduled for this view or filter criteria.
          </p>
          <Button
            size="sm"
            onClick={() => setBookingModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Book Appointment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.map((appt) => {
            const serviceNames = appt.services
              ?.map((s: any) => s.service?.name)
              .join(', ') || 'Salon Service';

            const statusColors: Record<string, 'primary' | 'warning' | 'purple' | 'success' | 'danger' | 'default'> = {
              Confirmed: 'primary',
              CheckedIn: 'warning',
              InProgress: 'purple',
              Completed: 'success',
              Cancelled: 'danger',
              NoShow: 'default',
            };

            return (
              <div
                key={appt.id}
                onClick={() => {
                  setSelectedAppt(appt);
                  setDetailsModalOpen(true);
                }}
                className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Time & Status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg font-mono">
                        {appt.startTime} - {appt.endTime}
                      </span>
                      {appt.isWalkIn && (
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Walk-in
                        </span>
                      )}
                    </div>
                    <Badge variant={statusColors[appt.status] || 'default'} size="sm">
                      {appt.status}
                    </Badge>
                  </div>

                  {/* Customer Info */}
                  <h4 className="text-base font-bold text-stone-900 group-hover:text-[#7C3AED] transition-colors flex items-center justify-between">
                    <span>{appt.customer?.name}</span>
                    <span className="text-xs font-normal text-stone-400">
                      {appt.customer?.phone}
                    </span>
                  </h4>

                  {/* Services */}
                  <div className="mt-2 text-xs text-stone-600 flex items-start gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{serviceNames}</span>
                  </div>

                  {/* Staff Info */}
                  <div className="mt-2 text-xs text-stone-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>Stylist: <strong className="text-stone-700">{appt.staff?.name}</strong></span>
                  </div>
                </div>

                {/* Footer Quick Actions */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-900">
                    {appt.totalDuration} mins
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {appt.status === 'Confirmed' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(appt.id, 'CheckedIn')}
                        className="text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition-colors"
                      >
                        Check In
                      </button>
                    )}
                    {appt.status === 'CheckedIn' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(appt.id, 'InProgress')}
                        className="text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors"
                      >
                        Start Service
                      </button>
                    )}
                    {appt.status === 'InProgress' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(appt.id, 'Completed')}
                        className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
                      >
                        Mark Done
                      </button>
                    )}
                    {appt.status === 'Completed' && (
                      <button
                        type="button"
                        onClick={() => handleConvertToBill(appt)}
                        className="text-[11px] font-semibold text-[#7C3AED] bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                      >
                        <Receipt className="w-3 h-3" />
                        <span>Create Bill</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── NEW APPOINTMENT MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title="Schedule New Appointment"
        description="Select client, assign staff stylist and pick multiple services"
        size="lg"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          {/* Customer Selection or Inline Create */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Customer Information
              </label>
              <button
                type="button"
                onClick={() => setNewCustomerMode(!newCustomerMode)}
                className="text-xs font-semibold text-[#7C3AED] hover:underline"
              >
                {newCustomerMode ? '← Pick Existing Client' : '+ Add New Client'}
              </button>
            </div>

            {newCustomerMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Full Name"
                  placeholder="e.g. Aarti Sharma"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  placeholder="e.g. +91 9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  required
                />
              </div>
            ) : (
              <SearchableSelect
                placeholder="-- Search & Select Existing Customer --"
                searchPlaceholder="Search client by name or phone (e.g. Meera, 99001)..."
                value={selectedCustomer}
                onChange={(val) => setSelectedCustomer(val)}
                options={customerOptions}
                emptyMessage="No clients found matching your search"
              />
            )}
          </div>

          {/* Date, Time & Staff Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="date"
              label="Appointment Date"
              value={apptDate}
              onChange={(e) => setApptDate(e.target.value)}
              required
            />
            <Input
              type="time"
              label="Start Time"
              value={apptStartTime}
              onChange={(e) => setApptStartTime(e.target.value)}
              required
            />
            <SearchableSelect
              label="Select Artist / Stylist"
              placeholder="-- Select Artist --"
              searchPlaceholder="Search artist by name or role..."
              value={selectedStaff}
              onChange={(val) => setSelectedStaff(val)}
              options={staffOptions}
              emptyMessage="No artists found matching your search"
              required
            />
          </div>

          {/* Multi-Service Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                Select Services ({selectedServices.length} selected)
              </label>
              {selectedServices.length > 0 && (
                <span className="text-xs font-bold text-[#7C3AED]">
                  Est. {totalDuration} mins • {formatCurrency(totalPrice)}
                </span>
              )}
            </div>

            {/* Service Search Bar */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search services (e.g. Haircut, Balayage, Manicure, Pedicure)..."
                className="w-full pl-9 pr-8 py-1.5 text-xs text-stone-900 bg-white border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
              {serviceSearch && (
                <button
                  type="button"
                  onClick={() => setServiceSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 border border-stone-200 rounded-xl bg-stone-50/50 scrollbar-thin">
              {filteredServicesList.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-1">
                  <Search className="w-4 h-4 text-stone-300" />
                  <span>No treatments found matching &ldquo;{serviceSearch}&rdquo;</span>
                </div>
              ) : (
                filteredServicesList.map((svc) => {
                  const isChecked = selectedServices.includes(svc.id);
                  return (
                    <label
                      key={svc.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-purple-50/90 border-[#7C3AED] text-stone-900 font-semibold shadow-xs'
                          : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleService(svc.id)}
                          className="rounded border-stone-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                        />
                        <div className="flex flex-col truncate">
                          <span className="truncate">{svc.name}</span>
                          {svc.category?.name && (
                            <span className="text-[10px] text-stone-400 truncate">
                              {svc.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-stone-900 font-bold">
                          {formatCurrency(svc.price)}
                        </span>
                        <span className="text-[10px] text-stone-400 block">
                          {svc.duration}m
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Walk-in & Notes */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isWalkIn}
                onChange={(e) => setIsWalkIn(e.target.checked)}
                className="rounded border-stone-300 text-[#7C3AED] focus:ring-[#7C3AED]"
              />
              <span>Mark as Walk-in Booking (Unscheduled)</span>
            </label>
          </div>

          <Input
            label="Appointment Notes (Optional)"
            placeholder="e.g. Client requested ammonia-free hair color, likes subtle highlights"
            value={apptNotes}
            onChange={(e) => setApptNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <Button
              variant="outline"
              onClick={() => setBookingModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Confirm & Book Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── APPOINTMENT DETAILS MODAL ───────────────────────────────── */}
      {selectedAppt && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title={`Appointment Details - ${selectedAppt.customer?.name}`}
          size="md"
        >
          <div className="space-y-4">
            {/* Status & Timing Banner */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-400 uppercase font-semibold">
                  Scheduled Time
                </span>
                <h4 className="text-base font-bold text-stone-900 mt-0.5">
                  {formatDate(selectedAppt.date)} ({selectedAppt.startTime} - {selectedAppt.endTime})
                </h4>
              </div>
              <Badge variant="primary" size="md">
                {selectedAppt.status}
              </Badge>
            </div>

            {/* Client & Staff Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-stone-400 font-semibold uppercase">Client</span>
                <p className="font-bold text-stone-900 mt-1">{selectedAppt.customer?.name}</p>
                <p className="text-stone-500 mt-0.5">{selectedAppt.customer?.phone}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-stone-400 font-semibold uppercase">Stylist</span>
                <p className="font-bold text-stone-900 mt-1">{selectedAppt.staff?.name}</p>
                <p className="text-stone-500 mt-0.5">{selectedAppt.staff?.role}</p>
              </div>
            </div>

            {/* Services breakdown */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-2">
                Services Reserved
              </span>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden text-xs">
                {selectedAppt.services?.map((svc: any) => (
                  <div
                    key={svc.id}
                    className="p-3 flex items-center justify-between bg-white"
                  >
                    <div>
                      <span className="font-semibold text-stone-800">
                        {svc.service?.name}
                      </span>
                      <span className="text-stone-400 block text-[11px]">
                        Duration: {svc.duration} mins
                      </span>
                    </div>
                    <span className="font-bold text-stone-900">
                      {formatCurrency(svc.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedAppt.notes && (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs">
                <span className="font-bold text-amber-900">Notes: </span>
                <span className="text-amber-800">{selectedAppt.notes}</span>
              </div>
            )}

            {/* Lifecycle Buttons */}
            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleCancelAppointment(selectedAppt.id)}
              >
                Cancel Booking
              </Button>

              <div className="flex items-center gap-2">
                {selectedAppt.status !== 'Completed' && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => {
                      handleUpdateStatus(selectedAppt.id, 'Completed');
                    }}
                  >
                    Mark as Completed
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => handleConvertToBill(selectedAppt)}
                  leftIcon={<Receipt className="w-3.5 h-3.5" />}
                >
                  Create Bill (POS)
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
