import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, CalendarDays, Clock, CheckCircle, ArrowRight, Star, Info, MessageSquare } from 'lucide-react';
import { useMarketContext } from '../../hooks/useMarketContext';
import { BACKEND_CONFIG } from '../../services/backend/config';

// Define an interface for the expected event structure based on API sample
interface CalendarEvent {
    id: string;
    date: string; // ISO string (maps to dateUtc from new API)
    country: string;
    indicator: string;
    title: string; // May be redundant with indicator
    importance: number; // -1 Low, 0 Med, 1 High (mapped from volatility)
    actual: number | string | null;
    forecast: number | string | null; // (mapped from consensus)
    previous: number | string | null;
    unit?: string;
    currency?: string; // (from currencyCode)
    revised?: number | string | null; // New field
}

// Helper function to format time
const formatEventTime = (isoDateString: string): string => {
    try {
        return new Date(isoDateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return 'Invalid Date';
    }
};

// Helper function to determine if an event is today
const isToday = (eventDate: Date): boolean => {
    const today = new Date();
    return eventDate.getDate() === today.getDate() &&
           eventDate.getMonth() === today.getMonth() &&
           eventDate.getFullYear() === today.getFullYear();
};

// Importance mapping (assuming -1=Low, 0=Med, 1=High)
const IMPORTANCE_MAP = {
    low: -1,
    medium: 0,
    high: 1,
};

// --- Date Helper Functions --- 
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

// Format date for display (e.g., Apr 12)
const formatDisplayDate = (isoDateString: string): string => {
    try {
        return new Date(isoDateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
        return 'Invalid Date';
    }
};

const getThisWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sun) to 6 (Sat)
    const firstDayOfWeek = new Date(today);
    // Adjust to Monday (assuming week starts Monday)
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    firstDayOfWeek.setDate(diff);

    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

    return {
        start: formatDate(firstDayOfWeek),
        end: formatDate(lastDayOfWeek),
        title: 'This Week'
    };
};

const getLastWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const firstDayOfLastWeek = new Date(today);
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) - 7; // Subtract 7 days
    firstDayOfLastWeek.setDate(diff);

    const lastDayOfLastWeek = new Date(firstDayOfLastWeek);
    lastDayOfLastWeek.setDate(firstDayOfLastWeek.getDate() + 6);

    return {
        start: formatDate(firstDayOfLastWeek),
        end: formatDate(lastDayOfLastWeek),
        title: 'Last Week'
    };
};

const getNextWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const firstDayOfNextWeek = new Date(today);
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + 7; // Add 7 days
    firstDayOfNextWeek.setDate(diff);

    const lastDayOfNextWeek = new Date(firstDayOfNextWeek);
    lastDayOfNextWeek.setDate(firstDayOfNextWeek.getDate() + 6);

    return {
        start: formatDate(firstDayOfNextWeek),
        end: formatDate(lastDayOfNextWeek),
        title: 'Next Week'
    };
};

const getThisMonthDates = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Day 0 of next month is last day of current

    return {
        start: formatDate(firstDayOfMonth),
        end: formatDate(lastDayOfMonth),
        title: 'This Month'
    };
};
// --- End Date Helpers ---

// Define Props interface
/*
interface EconomicCalendarProps {
  marketOverview: string | null; // Accept the overview text or null
}
*/

export const EconomicCalendar: React.FC = () => {
    const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRange, setSelectedRange] = useState<'thisWeek' | 'lastWeek' | 'nextWeek' | 'thisMonth'>('thisWeek');
    const [selectedImportance, setSelectedImportance] = useState<number>(IMPORTANCE_MAP.low); // Show all by default (-1)
    // State for Interpretation
    const [interpretationLoading, setInterpretationLoading] = useState(false);
    const [interpretationError, setInterpretationError] = useState<string | null>(null);
    const [currentInterpretation, setCurrentInterpretation] = useState<{ event: CalendarEvent; text: string } | null>(null);

    // Use the Market Context Hook here
    const { contextText: overallMarketContext, loading: contextLoading, error: contextError } = useMarketContext();

    const dateRangeDetails = useMemo(() => {
        switch (selectedRange) {
            case 'lastWeek': return getLastWeekDates();
            case 'nextWeek': return getNextWeekDates();
            case 'thisMonth': return getThisMonthDates();
            case 'thisWeek': 
            default: return getThisWeekDates();
        }
    }, [selectedRange]);

    useEffect(() => {
        const fetchCalendarData = async () => {
            setLoading(true);
            setError(null);
            setCurrentInterpretation(null); // Clear interpretation on range change
            setInterpretationError(null);
            // Use dates from dateRangeDetails based on selectedRange
            const { start, end } = dateRangeDetails; 
            const url = `${BACKEND_CONFIG.BASE_URL}/api/calendar/events?from=${start}&to=${end}`; // Removed countries param

            try {
                console.info(`Fetching calendar events from: ${url}`);
                const response = await fetch(url);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 504 || response.status === 503) {
                        throw new Error(`Service temporarily unavailable. The calendar service is experiencing high load. Please try again in a moment.`);
                    }
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
                }

                const data = await response.json();
                console.log(`Raw data received for ${selectedRange}:`, data);
                if (data.error) throw new Error(data.error);

                const fetchedEvents = Array.isArray(data.events)
                    ? data.events.sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    : [];

                setAllEvents(fetchedEvents);
                console.info(`Successfully fetched ${fetchedEvents.length} calendar events for ${selectedRange}.`);

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(errorMessage);
                console.error(`Fetch calendar error for ${selectedRange}:`, err);
            } finally {
                setLoading(false);
            }
        };

        fetchCalendarData();
    }, [dateRangeDetails]); // Re-fetch when dateRangeDetails changes (derived from selectedRange)

    // --- Filtering Logic with Importance --- 
    const displayedEvents = useMemo(() => {
        // Filter by importance first
        const importanceFiltered = allEvents.filter(event => event.importance >= selectedImportance);
        // Already sorted by date ascending from fetch
        return importanceFiltered;
    }, [allEvents, selectedImportance]);
    // --- End Filtering Logic ---

    // --- Function to handle Interpretation Request --- 
    const handleInterpretEvent = async (event: CalendarEvent) => {
        // Don't request again if already loading for this event
        if (interpretationLoading && currentInterpretation?.event.id === event.id) return; 
        
        setInterpretationLoading(true);
        setInterpretationError(null);
        setCurrentInterpretation(null); 
        console.log('[Interpret Request] Requesting for:', event.indicator, event.id);
        // Get the latest context from the hook state
        const contextToSend = overallMarketContext || "Overall market context was not available.";

        try {
            const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/calendar/interpret-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send the event object AND the fetched overall market context
                body: JSON.stringify({ 
                    event,
                    overallContext: contextToSend // Pass the context here
                }), 
            });
            console.log('[Interpret Request] Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                 console.error('[Interpret Request] Error Response Data:', errorData);
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            console.log('[Interpret Request] Success Response Data:', data);

            if (data.error) {
                throw new Error(data.error);
            }
            if (!data.interpretation || !data.eventId) {
                 throw new Error('Invalid interpretation response structure from server.');
            }
            
            // Set interpretation along with the event it belongs to
            setCurrentInterpretation({ event: event, text: data.interpretation }); 
            console.log('[Interpret Request] Interpretation received successfully.');

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setInterpretationError(errorMessage);
            console.error("[Interpret Request] Fetch error:", err);
        } finally {
            setInterpretationLoading(false);
        }
    };

    // --- Rendering Function for Table Row (Add Date Cell & Update Button) --- 
    const renderEventRow = (event: CalendarEvent) => {
        const now = new Date();
        const eventDate = new Date(event.date);
        const isPast = eventDate <= now;
        const isInterpreted = currentInterpretation?.event.id === event.id;

        return (
             <tr key={event.id} className={`text-sm ${isPast ? 'bg-white' : 'bg-gray-50'} ${isInterpreted ? 'bg-blue-50' : ''}`}> 
                <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-600">{formatDisplayDate(event.date)}</td>
                <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-800">{formatEventTime(event.date)}</td>
                <td className="px-2 py-2 whitespace-nowrap">
                     <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${getImportanceColor(event.importance)}`}>
                        {getImportanceLabel(event.importance)}
                    </span>
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-gray-600">{event.country}</td>
                <td className="px-2 py-2 text-gray-800 flex items-center">
                    {event.indicator}
                     {/* Interpretation Button */}
                    <button 
                        onClick={() => handleInterpretEvent(event)}
                        disabled={interpretationLoading && isInterpreted}
                        className="ml-2 p-0.5 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Explain Significance"
                    >
                        {interpretationLoading && isInterpreted ? 
                            <Loader2 size={14} className="animate-spin text-blue-600" /> : 
                            <Info size={14} className="text-blue-600" />
                        }
                    </button>
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-right font-semibold text-gray-900">
                     {isPast && event.actual !== null ? `${event.actual}${event.unit || ''}` : '-'}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-right text-gray-500">
                    {event.forecast !== null ? `${event.forecast}${event.unit || ''}` : '-'}
                </td>
                 <td className="px-2 py-2 whitespace-nowrap text-right text-gray-500">
                    {event.previous !== null ? `${event.previous}${event.unit || ''}` : '-'}
                 </td>
            </tr>
        );
    };

    // --- Importance Styling Helpers ---
    const getImportanceColor = (importance: number): string => {
        if (importance >= IMPORTANCE_MAP.high) return 'bg-red-100 text-red-800';
        if (importance === IMPORTANCE_MAP.medium) return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };
    const getImportanceLabel = (importance: number): string => {
        if (importance >= IMPORTANCE_MAP.high) return 'High';
        if (importance === IMPORTANCE_MAP.medium) return 'Med';
        return 'Low';
    };
    // --- End Importance Styling ---

    // --- Helper to render Table (Add Date Header) --- 
    const renderEventsTable = (events: CalendarEvent[], title: string) => (
        <div>
            {/* Title is now part of the main header */}
            {events.length > 0 ? (
                <div className="border rounded-md overflow-hidden max-h-[500px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10"><tr>
                                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imp.</th>
                                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicator</th>
                                <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                                <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast</th>
                                <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Previous</th>
                            </tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {events.map(renderEventRow)}
                        </tbody>
                    </table>
                 </div>
            ) : (
                 <p className="text-sm text-gray-500 italic p-4 text-center">
                    No events found for the selected criteria.
                 </p>
            )}
        </div>
    );

    // --- Main Rendering with Date Range Selector & Importance Filter --- 
    return (
        <div className="p-4 border rounded-lg shadow-sm bg-white">
            {/* Header Row - Add context loading/error info? Optional */}
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                 <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    Economic Calendar
                </h2>
                 {/* Control Row */}
                <div className="flex items-center flex-wrap gap-4"> {/* Allow wrapping */}
                     {/* Date Range Selector Buttons */}
                     <div className="flex items-center space-x-1 border p-0.5 rounded-md">
                         <span className="text-xs text-gray-500 px-1">Range:</span>
                        <button 
                            onClick={() => setSelectedRange('lastWeek')} 
                            className={`px-2 py-0.5 text-xs rounded-md ${selectedRange === 'lastWeek' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >Last Week</button>
                         <button 
                            onClick={() => setSelectedRange('thisWeek')} 
                            className={`px-2 py-0.5 text-xs rounded-md ${selectedRange === 'thisWeek' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >This Week</button>
                         <button 
                            onClick={() => setSelectedRange('nextWeek')} 
                            className={`px-2 py-0.5 text-xs rounded-md ${selectedRange === 'nextWeek' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >Next Week</button>
                         <button 
                            onClick={() => setSelectedRange('thisMonth')} 
                            className={`px-2 py-0.5 text-xs rounded-md ${selectedRange === 'thisMonth' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >This Month</button>
                    </div>
                     {/* Importance Filter Buttons */}
                    <div className="flex items-center space-x-1 border p-0.5 rounded-md">
                        <span className="text-xs text-gray-500 px-1">Min Importance:</span>
                        <button 
                            onClick={() => setSelectedImportance(IMPORTANCE_MAP.low)} 
                            className={`px-2 py-0.5 text-xs rounded-md ${selectedImportance === IMPORTANCE_MAP.low ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
                        >All</button>
                         <button 
                            onClick={() => setSelectedImportance(IMPORTANCE_MAP.medium)} 
                            className={`px-2 py-0.5 text-xs rounded-md ${selectedImportance === IMPORTANCE_MAP.medium ? 'bg-yellow-200 text-yellow-800' : 'text-gray-500 hover:bg-gray-100'}`}
                        >Med+</button>
                         <button 
                            onClick={() => setSelectedImportance(IMPORTANCE_MAP.high)} 
                            className={`px-2 py-0.5 text-xs rounded-md ${selectedImportance === IMPORTANCE_MAP.high ? 'bg-red-200 text-red-800' : 'text-gray-500 hover:bg-gray-100'}`}
                        >High</button>
                    </div>
                 </div>
            </div>
            {/* Display context loading/error state if desired - Example */}
            {/* {contextLoading && <p className="text-xs text-gray-400 italic mb-2">Loading overall context...</p>} */}
            {/* {contextError && <p className="text-xs text-red-500 italic mb-2">Error loading context: {contextError}</p>} */}

            {/* Loading / Error / No Data States */} 
            {loading && (
                 <div className="flex justify-center items-center p-8 text-gray-600">
                    <Loader2 className="animate-spin mr-2" size={20} /> Loading Calendar for {dateRangeDetails.title}...
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <div>Error fetching calendar for {dateRangeDetails.title}: {error}</div>
                </div>
            )}
             {!loading && !error && allEvents.length === 0 && (
                 <p className="text-sm text-gray-500 italic p-4 text-center">
                    No economic events found for {dateRangeDetails.title}.
                 </p>
            )}

            {/* Content Area: Render the table with filtered events */} 
            {!loading && !error && allEvents.length > 0 && (
                <div className="space-y-4">
                     {renderEventsTable(displayedEvents, dateRangeDetails.title)}
                     
                     {/* Interpretation Display Area (Improved) */}
                     <div className="mt-4 p-3 border rounded-md bg-blue-50 border-blue-200 min-h-[60px]">
                        <h4 className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1">
                            <MessageSquare size={16} className="text-blue-700"/> Interpretation 
                            {currentInterpretation && <span className="text-xs text-gray-600 font-normal">(for: {currentInterpretation.event.indicator})</span>}
                         </h4>
                        {interpretationLoading && (
                             <div className="flex items-center text-blue-700 text-sm">
                                <Loader2 className="animate-spin mr-2" size={16} /> Generating...
                            </div>
                        )}
                        {interpretationError && (
                            <p className="text-sm text-red-600">Error: {interpretationError}</p>
                        )}
                        {currentInterpretation && !interpretationLoading && !interpretationError ? (
                            <p className="text-sm text-blue-900 whitespace-pre-wrap">{currentInterpretation.text}</p>
                        ) : (
                            !interpretationLoading && !interpretationError && (
                                <p className="text-sm text-gray-500 italic">Click the <Info size={12} className="inline-block mx-1"/> icon next to an event indicator to get an explanation.</p>
                            )
                        )}
                     </div>
                </div>
            )}
        </div>
    );
}; 