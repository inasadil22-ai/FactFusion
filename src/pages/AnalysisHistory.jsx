import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, FileText, CheckCircle, XCircle, BarChart } from 'lucide-react';

// Function to determine text/background color based on the result
const getStatusClasses = (result) => {
    switch (result) {
        case 'Misinformation':
            return {
                icon: XCircle,
                text: 'text-red-400',
                bg: 'bg-red-500/20',
                label: 'Misinformation'
            };
        case 'Legitimate':
            return {
                icon: CheckCircle,
                text: 'text-green-400',
                bg: 'bg-green-500/20',
                label: 'Legitimate'
            };
        case 'Pending':
            return {
                icon: Clock,
                text: 'text-yellow-400',
                bg: 'bg-yellow-500/20',
                label: 'Analysis Pending'
            };
        default:
            return {
                icon: BarChart,
                text: 'text-gray-400',
                bg: 'bg-gray-500/20',
                label: 'Completed'
            };
    }
};

const AnalysisHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Temporary function to assign a simulated result
    const assignResult = () => {
        const results = ['Misinformation', 'Legitimate', 'Legitimate', 'Pending', 'Misinformation', 'Legitimate'];
        return results[Math.floor(Math.random() * results.length)];
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // NOTE: Using the original endpoint
                const response = await fetch('http://localhost:5000/api/all-uploads');

                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }

                const data = await response.json();
                
                // Transform data and inject a simulated result
                const transformedData = data.map((item, index) => ({
                    id: index + 1,
                    date: item.upload_time.split(' ')[0],
                    time: item.upload_time.split(' ')[1],
                    team: item.team_username,
                    filename: item.original_name,
                    size: item.size_mb,
                    result: assignResult(), // <-- SIMULATED RESULT
                }));

                setHistory(transformedData.reverse());
            } catch (err) {
                console.error('Error fetching history:', err);
                setError("Failed to load data. Ensure backend is running and API is correct.");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center pt-20">
                {/* Loading Spinner Color Changed */}
                <div className="flex items-center gap-3 text-red-400">
                    <Clock size={20} className="animate-spin" />
                    <p>Loading analysis history...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-neutral-950 text-white pt-20 flex items-center justify-center p-6">
                {/* Error Box Color/Style Kept */}
                <div className="p-8 rounded-xl bg-red-900/10 border border-red-500/20 text-center max-w-xl">
                    <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Data Fetch Error</h2>
                    <p className="text-gray-400 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
                {/* Title color updated */}
                <h1 className="text-4xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400 flex items-center gap-3">
                    <BarChart size={32} /> Analysis History
                </h1>

                {history.length === 0 ? (
                    <div className="text-center p-12 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-gray-400">No submissions have been recorded yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="min-w-full divide-y divide-white/10">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date / Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Team Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">File</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.map((item) => {
                                    const { icon: StatusIcon, text: textColor, bg: bgColor, label: statusLabel } = getStatusClasses(item.result);
                                    return (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-200">{item.date}</div>
                                            <div className="text-xs text-gray-500">{item.time}</div>
                                        </td>
                                        {/* Team name color changed */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-pink-400 font-semibold">{item.team}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 truncate max-w-xs" title={item.filename}>{item.filename}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400">{item.size} MB</td>
                                        
                                        {/* Result Status: Dynamic Class Assignment */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold gap-1 ${bgColor} ${textColor}`}>
                                                <StatusIcon size={12} /> {statusLabel}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalysisHistory;