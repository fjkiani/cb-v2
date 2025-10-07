import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, CalendarDays, Info } from 'lucide-react';
import { useMarketContext } from '../../hooks/useMarketContext';
import { BACKEND_CONFIG } from '../../services/backend/config';

// Define an interface matching the FMP API structure (without trendAnalysis)
interface EarningsEvent {
    date: string; 
    symbol: string;
    epsActual: number | null;
    epsEstimated: number | null;
    revenueActual: number | null;
    revenueEstimated: number | null;
    time?: string; 
    lastUpdated?: string;
}

// --- Date Helper Functions --- 
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const formatDisplayDate = (isoDateString: string): string => {
    try {
        return new Date(isoDateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
        return 'Invalid Date';
    }
};

const getThisWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const firstDayOfWeek = new Date(today);
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    firstDayOfWeek.setDate(diff);
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
    return { start: formatDate(firstDayOfWeek), end: formatDate(lastDayOfWeek), title: 'This Week' };
};

const getLastWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const firstDayOfLastWeek = new Date(today);
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) - 7; 
    firstDayOfLastWeek.setDate(diff);
    const lastDayOfLastWeek = new Date(firstDayOfLastWeek);
    lastDayOfLastWeek.setDate(firstDayOfLastWeek.getDate() + 6);
    return { start: formatDate(firstDayOfLastWeek), end: formatDate(lastDayOfLastWeek), title: 'Last Week' };
};

const getNextWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const firstDayOfNextWeek = new Date(today);
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + 7;
    firstDayOfNextWeek.setDate(diff);
    const lastDayOfNextWeek = new Date(firstDayOfNextWeek);
    lastDayOfNextWeek.setDate(firstDayOfNextWeek.getDate() + 6);
    return { start: formatDate(firstDayOfNextWeek), end: formatDate(lastDayOfNextWeek), title: 'Next Week' };
};
// --- End Date Helpers ---

// Helper to format large numbers (Revenue)
const formatNumber = (num: number | null): string => {
    if (num === null || num === undefined) return '-';
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B'; // Adjusted precision
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M'; // Adjusted precision
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K'; // Adjusted precision
    return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

// Helper for EPS formatting
const formatEPS = (num: number | null): string => {
    if (num === null || num === undefined) return '-';
    return num.toFixed(2);
}

export const EarningsCalendar: React.FC = () => {
    const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRange, setSelectedRange] = useState<'thisWeek' | 'lastWeek' | 'nextWeek'>('thisWeek');
    
    // --- State for On-Demand Analysis ---
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [currentAnalysis, setCurrentAnalysis] = useState<{ symbol: string; text: string } | null>(null);
    // --- End Analysis State ---

    // Use the Market Context Hook here
    const { contextText: overallMarketContext, loading: contextLoading, error: contextError } = useMarketContext();

    const dateRangeDetails = useMemo(() => {
        switch (selectedRange) {
            case 'lastWeek': return getLastWeekDates();
            case 'nextWeek': return getNextWeekDates();
            case 'thisWeek': 
            default: return getThisWeekDates();
        }
    }, [selectedRange]);

    useEffect(() => {
        const fetchEarningsData = async () => {
            setLoading(true);
            setError(null);
            setCurrentAnalysis(null); // Clear analysis when range changes
            setAnalysisError(null);
            const { start, end } = dateRangeDetails;
            // Construct URL without symbol parameter
            const url = `${BACKEND_CONFIG.BASE_URL}/api/calendar/earnings?from=${start}&to=${end}`;

            try {
                console.info(`Fetching FMP earnings events from: ${url}`);
                const response = await fetch(url);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 504 || response.status === 503) {
                        throw new Error(`Earnings service temporarily unavailable. The API is experiencing high load. Please try again in a moment.`);
                    }
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
                }

                const data = await response.json();
                console.log(`Raw FMP calendar data received for ${selectedRange}:`, data);
                if (data.error) throw new Error(data.error);

                // Data is expected under earningsCalendar key from our route
                const fetchedEvents = Array.isArray(data.earningsCalendar)
                    ? data.earningsCalendar.sort((a: EarningsEvent, b: EarningsEvent) => {
                        // Sort by date first, then by symbol
                        const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                        if (dateComparison !== 0) return dateComparison;
                        return a.symbol.localeCompare(b.symbol);
                      })
                    : [];

                // --> Add console log to inspect fetched data <--
                console.log('Events received by frontend (basic):', fetchedEvents); 

                setEarningsEvents(fetchedEvents);
                console.info(`Successfully fetched ${fetchedEvents.length} FMP earnings events for ${selectedRange}.`);

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(errorMessage);
                console.error(`Fetch FMP earnings error for ${selectedRange}:`, err);
            } finally {
                setLoading(false);
            }
        };

        fetchEarningsData();
    }, [dateRangeDetails]); 

    // --- Function to handle On-Demand Analysis Click ---
    const handleAnalyzeClick = async (event: EarningsEvent) => {
        if (analysisLoading && currentAnalysis?.symbol === event.symbol) return; // Don't re-fetch if loading for same symbol

        setAnalysisLoading(true);
        setAnalysisError(null);
        setCurrentAnalysis(null);
        console.log(`[Analyze] Requesting trend for ${event.symbol}`);
        // Get latest context from hook
        const contextToSend = overallMarketContext || "Overall market context was not available.";

        try {
            const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/calendar/earnings/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send symbol, event, AND overallContext
                body: JSON.stringify({ 
                    symbol: event.symbol, 
                    event: event, 
                    overallContext: contextToSend 
                }), 
            });
            console.log(`[Analyze] Response status for ${event.symbol}:`, response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                console.error(`[Analyze] Error Response Data for ${event.symbol}:`, errorData);
                if (response.status === 504 || response.status === 503) {
                    throw new Error(`Analysis service temporarily unavailable. Please try again in a moment.`);
                }
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            console.log(`[Analyze] Success Response Data for ${event.symbol}:`, data);

            if (data.error) {
                throw new Error(data.error);
            }
            if (!data.analysis || !data.symbol) {
                 throw new Error('Invalid analysis response structure from server.');
            }
            
            setCurrentAnalysis({ symbol: data.symbol, text: data.analysis }); 
            console.log(`[Analyze] Analysis received successfully for ${event.symbol}.`);

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setAnalysisError(errorMessage);
            // Show a more helpful message for missing estimates
            const displayMessage = typeof event.epsEstimated !== 'number' 
                ? `Analysis unavailable for ${event.symbol}: No earnings estimate available for analysis.`
                : `Error: ${errorMessage}`;
            setCurrentAnalysis({ symbol: event.symbol, text: displayMessage }); // Show error in display
            console.error(`[Analyze] Fetch error for ${event.symbol}:`, err);
        } finally {
            setAnalysisLoading(false);
        }
    };
    // --- End Analysis Click Handler ---

    const renderEventRow = (event: EarningsEvent, index: number) => {
        const isAnalysisLoadingForThis = analysisLoading && currentAnalysis?.symbol === event.symbol;
        
        return (
            <tr key={`${event.symbol}-${event.date || index}`} className={`text-sm bg-white hover:bg-gray-50 ${currentAnalysis?.symbol === event.symbol ? 'bg-blue-50' : ''}`}>
                <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-600">{formatDisplayDate(event.date)}</td>
                <td className="px-2 py-2 whitespace-nowrap font-semibold text-blue-700">
                    <div className="flex items-center gap-1">
                        <span>{event.symbol}</span>
                        {/* Show Info icon for analysis - now available for all earnings */}
                        <button 
                            onClick={() => handleAnalyzeClick(event)}
                            disabled={analysisLoading && currentAnalysis?.symbol === event.symbol} // Disable only if loading for this specific one
                            className="p-0.5 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                            title="Analyze Trend"
                        >
                            {isAnalysisLoadingForThis ? 
                                <Loader2 size={14} className="animate-spin text-blue-600" /> : 
                                <Info size={14} className="text-blue-600" />
                            }
                        </button>
                    </div>
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-right text-gray-700">{formatEPS(event.epsEstimated)}</td>
                <td className="px-2 py-2 whitespace-nowrap text-right font-semibold text-gray-900">{formatEPS(event.epsActual)}</td>
                <td className="px-2 py-2 whitespace-nowrap text-right text-gray-700">{formatNumber(event.revenueEstimated)}</td>
                <td className="px-2 py-2 whitespace-nowrap text-right font-semibold text-gray-900">{formatNumber(event.revenueActual)}</td>
            </tr>
        );
    };

    return (
        <div className="p-4 border rounded-lg shadow-sm bg-white mt-6">
            {/* Header Row */}
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-green-600" />
                    Earnings Calendar (FMP)
                </h2>
                {/* Control Row */}
                <div className="flex items-center flex-wrap gap-4">
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
                    </div>
                 </div>
            </div>

            {/* Optional: Display context loading/error */}
            {/* {contextLoading && <p className="text-xs text-gray-400 italic mb-2">Loading overall context...</p>} */}
            {/* {contextError && <p className="text-xs text-red-500 italic mb-2">Error loading context: {contextError}</p>} */}

            {/* Loading / Error / No Data States */} 
            {loading && (
                 <div className="flex justify-center items-center p-8 text-gray-600">
                    <Loader2 className="animate-spin mr-2" size={20} /> Loading Earnings for {dateRangeDetails.title}...
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <div>Error fetching earnings for {dateRangeDetails.title}: {error}</div>
                </div>
            )}
             {!loading && !error && earningsEvents.length === 0 && (
                 <p className="text-sm text-gray-500 italic p-4 text-center">
                    No earnings events found for {dateRangeDetails.title}.
                 </p>
            )}

            {/* Content Area: Render the table */} 
            {!loading && !error && earningsEvents.length > 0 && (
                <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                                <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">EPS Est.</th>
                                <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">EPS Actual</th>
                                <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rev. Est.</th>
                                <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rev. Actual</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {earningsEvents.map(renderEventRow)}
                        </tbody>
                    </table>
                 </div>
            )}

             {/* --- Analysis Display Area --- */}
             <div className="mt-4 p-3 border rounded-md bg-blue-50 border-blue-200 min-h-[60px]">
                <h4 className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1">
                    Earnings Trend Analysis
                    {currentAnalysis && <span className="text-xs text-gray-600 font-normal">(for: {currentAnalysis.symbol})</span>}
                </h4>
                {analysisLoading && (
                    <div className="flex items-center text-blue-700 text-sm">
                        <Loader2 className="animate-spin mr-2" size={16} /> Generating analysis for {currentAnalysis?.symbol}... 
                    </div>
                )}
                {analysisError && !analysisLoading && (
                    <p className="text-sm text-red-600">Error analyzing {currentAnalysis?.symbol}: {analysisError}</p>
                )}
                {currentAnalysis && !analysisLoading && !analysisError ? (
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{currentAnalysis.text}</p>
                ) : ( 
                    !analysisLoading && !analysisError && (
                        <p className="text-sm text-gray-500 italic">Click the <Info size={12} className="inline-block mx-1"/> icon next to a symbol to analyze its earnings trend.</p>
                    )
                )}
             </div>
             {/* --- End Analysis Display Area --- */}
        </div>
    );
}; 