document.addEventListener('DOMContentLoaded', function () {
    const dateInput = document.getElementById('date');
    const processButton = document.getElementById('processButton');
    const resultsDiv = document.getElementById('results');
    const errorMessage = document.getElementById('error');


    processButton.addEventListener('click', function () {
        const dateValue = dateInput.value;


        if (!dateValue) {
            errorMessage.textContent="Please enter a date";
            return;
        }
        errorMessage.textContent = ""; // Clear any previous error message
        let selectedDate = new Date(dateValue);

        // Set time to 7 AM Central Time (adjust for your timezone if needed)
        selectedDate.setHours(19, 0, 0, 0);

        // Convert to Unix timestamp (seconds since epoch)
        const startTimeStamp = Math.floor(selectedDate.getTime() / 1000);
        const endTimeStamp =  startTimeStamp + 86400; //23:59:59.999

        resultsDiv.textContent = `Date: ${dateValue}, Start Timestamp: ${startTimeStamp}, End Timestamp: ${endTimeStamp}`;

        //  Here you would call your functions.
        processReports(startTimeStamp, endTimeStamp);
    });

    function processReports(startDate, endDate) {
        resultsDiv.textContent += `<br>Calling processReports with start: ${startDate} and end: ${endDate}...<br>`;
        const venueId = '50971';

        // 1.  Simulate Fetch CSV Data
        const csvUrl = `https://admin.touchbistro.com/api/frontend/report/v1/venues/${venueId}/reports/export_data?start=${startDate}&end=${endDate}&report_name=audit_accounts_details&type=csv`;
         
        mockFetchCSV(csvUrl)
            .then(csvData => {
                resultsDiv.textContent += `<br>CSV Data Fetched:<br>${JSON.stringify(csvData)}`;
                // 2. Extract Bill Numbers
                const billNumbers = extractBillNumbers(csvData);
                resultsDiv.textContent += `<br>Bill Numbers: ${JSON.stringify(billNumbers)}<br>`;

                // 3. Fetch Bill IDs
                const billsUrl = `https://admin.touchbistro.com/api/frontend/report/v1/venues/${venueId}/reports/bills?start=${startDate}&end=${endDate}`;
                return mockFetchBills(billsUrl)
                .then(bills => {
                    resultsDiv.textContent += `<br>Bills Data: ${JSON.stringify(bills)}<br>`;
                    const billIdMap = mapBillIds(bills);
                    return {csvData, billNumbers, billIdMap};
                })
            })
            .then( data => {
                // 4. Fetch Bill Details and Process Data
                return fetchBillDetails(data.billNumbers, data.billIdMap, data.csvData);
            })
            .then(billDetails => {
                resultsDiv.textContent += `<br>Bill Details: ${JSON.stringify(billDetails.billDetails)}<br>`;
               // 5. Modify CSV Data
                const modifiedCsv = modifyCsvData(billDetails.csvData, billDetails.billDetails);
                resultsDiv.textContent += `<br>Modified CSV Data: <br>${JSON.stringify(modifiedCsv)}<br>`;

                downloadCsv(modifiedCsv, `AYC_details${startDate}.csv`);
            })
            .catch(error => {
                resultsDiv.textContent += `<br>Error: ${error.message}<br>`;
            })
    }

    // Mock API functions (replace with actual fetch calls)
    const mockFetchCSV = async (url) => {
        const csvResult = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/csv',
                //  Include any necessary authentication headers (e.g., API key, session token)
                //  'Authorization': `Bearer YOUR_API_KEY`,
                //  'Cookie': 'your_session_cookie',
            },
        });

        if (!csvResult.ok) {
            throw new Error(`Failed to fetch CSV data: ${csvResult.status} ${csvResult.statusText}`);
        }

        const csvData = await csvResult.text();
        return parseCSV(csvData);
        
        /*await new Promise(resolve => setTimeout(resolve, 1500));
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
        }*/
        throw new Error(`Mock CSV data not found for URL: ${url}`);
    };

    const mockFetchBills = async (url) => {
        const billResult = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                //  Include any necessary authentication headers (e.g., API key, session token)
                //  'Authorization': `Bearer YOUR_API_KEY`,
                //  'Cookie': 'your_session_cookie',
            },
        });

        if (!billResult.ok) {
            throw new Error(`Failed to fetch Bill data: ${billResult.status} ${billResult.statusText}`);
        }

        const data = await billResult.json();
        return data;
        
        /*await new Promise(resolve => setTimeout(resolve, 1000));
        if (url.includes('bills')) {
            return [
                { bill_id: '1001_id', bill_number: '1001' },
                { bill_id: '1002_id', bill_number: '1002' },
                { bill_id: '1003_id', bill_number: '1003' },
                { bill_id: '1004_id', bill_number: '1004' },
            ];
        }
        throw new Error(`Mock bills data not found for URL: ${url}`);*/
    };

   const mockFetchBillDetails = async (url) => {
        const detailsResult = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                //  Include any necessary authentication headers (e.g., API key, session token)
                //  'Authorization': `Bearer YOUR_API_KEY`,
                //  'Cookie': 'your_session_cookie',
            },
        });

        if (!detailsResult.ok) {
            throw new Error(`Failed to fetch Bill data: ${detailsResult.status} ${detailsResult.statusText}`);
        }

        const data = await detailsResult.json();
        return data;

        /*await new Promise(resolve => setTimeout(resolve, 2000));

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
                    return null;
            }
        }
        throw new Error(`Mock bill details data not found for URL: ${url}`);*/
    };

    // Helper Functions
    function downloadCsv(data, filename) {
        const csvContent = convertArrayToCsv(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url: url,
            filename: filename,
        }, function (downloadId) {
            if (downloadId) {
                console.log(`Downloaded file with ID: ${downloadId}`);
            } else {
                console.error("Failed to start download");
            }
            URL.revokeObjectURL(url); // Clean up the URL object after the download is initiated.
        });
    }

    function convertArrayToCsv(data) {
        if (!data || data.length === 0) {
            return '';
        }

        const header = data[0].join(',');
        const rows = data.slice(1).map(row => row.join(','));
        return `${header}\n${rows.join('\n')}`;
    }

    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        return lines.map(line => {
            // Handle commas within quotes correctly.
            let inQuote = false;
            let value = "";
            const row = [];
            for(let i = 0; i < line.length; i++){
                const char = line[i];
                if(char === '"'){
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote){
                    row.push(value.trim());
                    value = "";
                }
                else {
                    value += char;
                }
            }
            row.push(value.trim());
            return row;

        });
    };
    function extractBillNumbers(csvData) {
        return csvData
            .slice(1)
            .map(row => row[1])
            .filter((value, index, self) => self.indexOf(value) === index);
    }

    function mapBillIds(bills) {
        const billIdMap = new Map();
        bills.forEach(bill => {
            billIdMap.set(bill.bill_number, bill.bill_id);
        });
        return billIdMap;
    }

   async function fetchBillDetails(billNumbers, billIdMap, csvData) {
        const venueId = '50971';
        const billDetails = {};

        for (const billNumber of billNumbers) {
            const billId = billIdMap.get(Number(billNumber));
            if (billId) {
                const billDetailsUrl = `https://admin.touchbistro.com/api/frontend/report/v1/venues/${venueId}/reports/bill-report-details/?bill_id=${billId}`;
                const details = await mockFetchBillDetails(billDetailsUrl);
                if (details) {
                    let bar = 0;
                    let food = 0;
                    let tax1 = 0;
                    let tax2 = 0;
                    let tip = Number(details.totals.tips_total);

                    details.totals.sales_categories.forEach(category => {
                        if (category.sales_category_name === 'Alcohol') {
                            bar = Number(category.total);
                        } else if (category.sales_category_name === 'Food') {
                            food = food + Number(category.total);
                        } else if (category.sales_category_name === 'Drinks'){
                            food = food + Number(category.total);
                        }
                    });

                    details.totals.taxes.forEach(tax => {
                        if (tax.tax_number === 'tax_1') {
                            tax1 = Number(tax.total);
                        } else if (tax.tax_number === 'tax_2') {
                            tax2 = Number(tax.total);
                        }
                    });
                    billDetails[billNumber] = { bar, food, tax1, tax2, tip };
                }
                 else {
                    billDetails[billNumber] = { bar: 0, food: 0, tax1: 0, tax2: 0, tip: 0 };
                    console.warn(`No details found for bill number ${billNumber}`);
                }
            } else {
                 billDetails[billNumber] = { bar: 0, food: 0, tax1: 0, tax2: 0, tip: 0 };
                console.warn(`No bill_id found for bill number ${billNumber}`);
            }
        }
        return {billDetails, csvData};
    }

    function modifyCsvData(csvData, billDetails) {
        const modifiedCsv = [...csvData];
        modifiedCsv[0] = [...modifiedCsv[0], 'Bar', 'Food', 'Tax', '1pct', 'Tip'];
        for (let i = 1; i < modifiedCsv.length; i++) {
            const billNumber = modifiedCsv[i][1];
            if (billNumber == ""){
                continue;
            } 
            const data = billDetails[Number(billNumber)] || { bar: 0, food: 0, tax1: 0, tax2: 0, tip: 0 };
            modifiedCsv[i] = [...modifiedCsv[i], (data.bar>0?data.bar.toFixed(2):""), (data.food>0?data.food.toFixed(2):""), 
                (data.tax1>0?data.tax1.toFixed(2):""), (data.tax2>0?data.tax2.toFixed(2):""), (data.tip>0?data.tip.toFixed(2):"")];
        }
        return modifiedCsv;
    }
});