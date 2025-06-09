import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, File, FileJson, FileText, Loader2, Calendar } from 'lucide-react';
import { cn } from "@/lib/utils"
import { format, isValid } from 'date-fns';
import { DateRange, DateRangePicker } from 'react-day-picker'; // Import DateRangePicker
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Mock API functions (replace with actual fetch calls in a real implementation)
//  Important:  These are MOCKS.  You MUST replace these with actual fetch calls
//  and handle authentication, errors, and data extraction correctly.
const mockFetchCSV = async (url: string): Promise<string[][]> => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

    // Very basic CSV parsing (for demonstration only - use a library for real parsing)
    if (url.includes('audit_accounts_details')) {
        return [
            ['Bill Number', 'Account Name', 'Amount'],
            ['1001', 'Food Sales', '20.00'],
            ['1001', 'Alcohol Sales', '15.00'],
            ['1002', 'Food Sales', '30.00'],
            ['1003', 'Food Sales', '25.00'],
            ['1003', 'Alcohol Sales', '18.00'],
            ['1004', 'Other Sales', '12.00'],
            ['1004', 'Food Sales', '10.00'],
        ];
    }
    throw new Error(`Mock CSV data not found for URL: ${url}`);
};

const mockFetchBills = async (url: string): Promise<{ bill_id: string; bill_number: string }[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (url.includes('bills')) {
        return [
            { bill_id: '1001_id', bill_number: '1001' },
            { bill_id: '1002_id', bill_number: '1002' },
            { bill_id: '1003_id', bill_number: '1003' },
            { bill_id: '1004_id', bill_number: '1004' },
        ];
    }
    throw new Error(`Mock bills data not found for URL: ${url}`);
};

const mockFetchBillDetails = async (url: string): Promise<{
    totals: {
        sales_categories: { sales_category_name: string; total: number }[];
        taxes: { tax_number: string; total: number }[];
        tips_total: number;
    };
} | null> => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (url.includes('bill-report-details')) {
        const billId = url.split('bill_id=')[1];
        switch (billId) {
            case '1001_id':
                return {
                    totals: {
                        sales_categories: [
                            { sales_category_name: 'Food', total: 20.00 },
                            { sales_category_name: 'Alcohol', total: 15.00 },
                        ],
                        taxes: [{ tax_number: 'tax_1', total: 2.00 }, { tax_number: 'tax_2', total: 1.50 }],
                        tips_total: 5.00,
                    },
                };
            case '1002_id':
                return {
                    totals: {
                        sales_categories: [{ sales_category_name: 'Food', total: 30.00 }],
                        taxes: [{ tax_number: 'tax_1', total: 3.00 }, { tax_number: 'tax_2', total: 2.00 }],
                        tips_total: 6.00,
                    },
                };
            case '1003_id':
                return {
                    totals: {
                        sales_categories: [
                            { sales_category_name: 'Food', total: 25.00 },
                            { sales_category_name: 'Alcohol', total: 18.00 },
                        ],
                        taxes: [{ tax_number: 'tax_1', total: 2.50 }, { tax_number: 'tax_2', total: 1.80 }],
                        tips_total: 7.00,
                    },
                };
            case '1004_id':
                return {
                    totals: {
                        sales_categories: [{ sales_category_name: 'Other Sales', total: 12.00 }, { sales_category_name: 'Food', total: 10.00 }],
                        taxes: [{ tax_number: 'tax_1', total: 1.20 }, { tax_number: 'tax_2', total: 1.00 }],
                        tips_total: 3.00,
                    }
                }
            default:
                return null; // Or throw an error, depending on how you want to handle unknown bill IDs
        }
    }
    throw new Error(`Mock bill details data not found for URL: ${url}`);
};

const TouchBistroReportProcessor = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [csvData, setCsvData] = useState<string[][] | null>(null);
    const [modifiedCsvData, setModifiedCsvData] = useState<string[][] | null>(null);
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });

    const processReports = async () => {
        setLoading(true);
        setError(null);
        setCsvData(null);
        setModifiedCsvData(null);

        if (!date?.from) {
            setError("Please select a date.");
            setLoading(false);
            return;
        }

        const startDate = Math.floor(date.from.getTime() / 1000);
        const endDate = date.to ? Math.floor(date.to.getTime() / 1000) : Math.floor(date.from.getTime() / 1000) + 86399; // End of the day

        const venueId = '50971'; //  Hardcoded venue ID -  This would typically be a user setting

        try {
            // 1. Fetch CSV Data
            const csvUrl = `https://admin.touchbistro.com/api/frontend/report/v1/venues/${venueId}/reports/export_data?start=${startDate}&end=${endDate}&report_name=audit_accounts_details&type=csv`;
            const csvResult = await mockFetchCSV(csvUrl);  // Replace with actual fetch
            setCsvData(csvResult);
            console.log('CSV Data:', csvResult);

            // 2. Extract Bill Numbers
            const billNumbers = csvResult
                .slice(1) // Remove header row
                .map(row => row[1]) // "Bill Number" is the second column
                .filter((value, index, self) => self.indexOf(value) === index); // Get unique bill numbers
            console.log("Bill Numbers from CSV:", billNumbers);

            // 3. Fetch Bill IDs
            const billsUrl = `https://admin.touchbistro.com/api/frontend/report/v1/venues/${venueId}/reports/bills?start=${startDate}&end=${endDate}`;
            const bills = await mockFetchBills(billsUrl); // Replace with actual fetch
            console.log('Bills Data:', bills);

            // Create a map for bill_number to bill_id
            const billIdMap = new Map<string, string>();
            bills.forEach(bill => {
                billIdMap.set(bill.bill_number, bill.bill_id);
            });

            // 4. Fetch Bill Details and Process Data
            const billDetails: Record<string, {
                bar: number;
                food: number;
                tax1: number;
                tax2: number;
                tip: number;
            }> = {};

            for (const billNumber of billNumbers) {
                const billId = billIdMap.get(billNumber);
                if (billId) {
                    const billDetailsUrl = `https://admin.touchbistro.com/api/frontend/report/v1/venues/${venueId}/reports/bill-report-details/?bill_id=${billId}`;
                    const details = await mockFetchBillDetails(billDetailsUrl); // Replace with actual fetch
                    console.log(`Bill Details for ${billNumber} (${billId}):`, details);

                    if (details) {
                        let bar = 0;
                        let food = 0;
                        let tax1 = 0;
                        let tax2 = 0;
                        let tip = details.totals.tips_total;

                        details.totals.sales_categories.forEach(category => {
                            if (category.sales_category_name === 'Alcohol') {
                                bar = category.total;
                            } else if (category.sales_category_name === 'Food') {
                                food = category.total;
                            }
                        });

                        details.totals.taxes.forEach(tax => {
                            if (tax.tax_number === 'tax_1') {
                                tax1 = tax.total;
                            } else if (tax.tax_number === 'tax_2') {
                                tax2 = tax.total;
                            }
                        });

                        billDetails[billNumber] = { bar, food, tax1, tax2, tip };
                    } else {
                        billDetails[billNumber] = { bar: 0, food: 0, tax1: 0, tax2: 0, tip: 0 };
                        console.warn(`No details found for bill number ${billNumber}`);
                    }
                } else {
                    billDetails[billNumber] = { bar: 0, food: 0, tax1: 0, tax2: 0, tip: 0 };
                    console.warn(`No bill_id found for bill number ${billNumber}`);
                }
            }
            console.log("Processed Bill Details:", billDetails);

            // 5. Modify CSV Data
            const modifiedCsv = [...csvResult]; // Create a copy to avoid mutating the original state directly.
            // Add the new headers
            modifiedCsv[0] = [...modifiedCsv[0], 'Bar', 'Food', 'Tax', '1pct', 'Tip'];

            // Add the data for each row
            for (let i = 1; i < modifiedCsv.length; i++) {
                const billNumber = modifiedCsv[i][1];
                const data = billDetails[billNumber] || { bar: 0, food: 0, tax1: 0, tax2: 0, tip: 0 }; // Default to 0 if no data
                modifiedCsv[i] = [...modifiedCsv[i], data.bar.toFixed(2), data.food.toFixed(2), data.tax1.toFixed(2), data.tax2.toFixed(2), data.tip.toFixed(2)]; // Format to 2 decimal places
            }

            setModifiedCsvData(modifiedCsv);
            console.log('Modified CSV Data:', modifiedCsv);

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const getFileTypeIcon = (data: any): React.ReactNode => {
        if (!data) return null;

        if (Array.isArray(data)) {
            // Assume it's CSV-like data (array of arrays)
            return <FileText className="h-4 w-4" />;
        } else if (typeof data === 'object') {
            // Assume it's JSON data
            return <FileJson className="h-4 w-4" />;
        } else {
            return <File className="h-4 w-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-white text-center">
                    TouchBistro Report Processor
                </h1>
                <p className="text-gray-300 text-center">
                    Fetch and process TouchBistro reports to add sales data to a CSV.
                </p>

                {/* Date Picker */}
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 sm:p-6 space-y-4 border border-white/10">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-200">
                            Date Range:
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-black/20 text-white border-gray-700",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y")} -{" "}
                                                {format(date.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-white/5 backdrop-blur-md border border-white/10" align="start">
                                <div className="p-2">
                                    <DateRangePicker // Corrected component name
                                        mode="range"
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={2}
                                        className="rounded-md"
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        onClick={processReports}
                        disabled={loading}
                        className={cn(
                            "w-full bg-blue-500/90 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200",
                            "disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        )}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin h-5 w-5" />
                                Processing...
                            </>
                        ) : (
                            'Process Reports'
                        )}
                    </Button>
                </div>

                {/* Results Section */}
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 sm:p-6 space-y-4 border border-white/10">
                    <h2 className="text-lg font-semibold text-gray-200">Results:</h2>
                    {csvData && (
                        <div className="p-3 bg-gray-800/50 rounded-md border border-gray-700 overflow-x-auto">
                            <div className="flex items-center gap-2 mb-2">
                                {getFileTypeIcon(csvData)}
                                <span className="text-gray-300 font-medium">Original CSV Data:</span>
                            </div>
                            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                                {JSON.stringify(csvData, null, 2)}
                            </pre>
                        </div>
                    )}
                    {modifiedCsvData && (
                        <div className="p-3 bg-gray-800/50 rounded-md border border-gray-700 overflow-x-auto">
                            <div className="flex items-center gap-2 mb-2">
                                {getFileTypeIcon(modifiedCsvData)}
                                <span className="text-gray-300 font-medium">Modified CSV Data:</span>
                            </div>
                            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                                {JSON.stringify(modifiedCsvData, null, 2)}
                            </pre>
                        </div>
                    )}
                    {error && (
                        <Alert variant="destructive" className="border-red-500 bg-red-500/10 text-red-300">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TouchBistroReportProcessor;

