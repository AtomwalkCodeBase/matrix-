import moment from "moment";

const MONTH_SHORT_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_MAP = MONTH_SHORT_NAMES.reduce((acc, m, i) => {
    acc[m.toLowerCase()] = i;
    return acc;
}, {});

const parseApiDate = (apiDateStr) => {
    if (!apiDateStr || typeof apiDateStr !== "string") return null;
    const parts = apiDateStr.split("-");
    if (parts.length !== 3) return null;
    const dd = parseInt(parts[0], 10);
    const mon = parts[1];
    const yyyy = parseInt(parts[2], 10);
    const monthIndex = MONTH_MAP[mon.toLowerCase()];
    if (isNaN(dd) || isNaN(monthIndex) || isNaN(yyyy)) return null;
    // Create date in local timezone
    return new Date(yyyy, monthIndex, dd, 0, 0, 0, 0);
};

export const formatToApiDate = (d) => {
    if (!(d instanceof Date)) return null;
    const dd = String(d.getDate()).padStart(2, "0");
    const mon = MONTH_SHORT_NAMES[d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd}-${mon}-${yyyy}`;
};

export const formatToDDMMYYYY = (dateValue) => {
    if (!dateValue) return ""

    if (dateValue instanceof Date) {
        const dd = String(dateValue.getDate()).padStart(2, "0")
        const mm = String(dateValue.getMonth() + 1).padStart(2, "0")
        const yyyy = dateValue.getFullYear()
        return `${dd}-${mm}-${yyyy}`
    }

    if (typeof dateValue === "string" && dateValue.includes("-")) {
        const [year, month, day] = dateValue.split("-")
        return `${day}-${month}-${year}`
    }

    return ""
}

export const formatAPITime = (time24) => {
  if (!time24) return ""
  const [h, m] = time24.split(":")
  let hours = parseInt(h, 10)
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12 || 12
  return `${hours.toString().padStart(2, "0")}:${m} ${ampm}`
}

export function formatAMPMTime(time) {
  // If you pass a time like "13:45" or "01:45 PM"
  return moment(time, ["HH:mm", "hh:mm A"]).format("hh:mm A");
}

const isDateInRange = (apiDateStr, startApi, endApi) => {
    const d = parseApiDate(apiDateStr);
    const s = parseApiDate(startApi);
    const e = parseApiDate(endApi);
    if (!d || !s || !e) return false;
    // compare only yyyy-mm-dd by zeroing time already done in parseApiDate
    return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
};

export const getTodayApiDateStr = () => {
    const d = new Date();
    return formatToApiDate(d);
};

const parseGeoData = (geoString) => {
    if (!geoString || typeof geoString !== "string") {
        return { check_in: null, check_out: null };
    }

    // Split by 'O|' to get all pieces. First piece contains the "I|" info.
    const parts = geoString.split("O|");
    const checkInPart = parts[0] || "";
    const checkOutPart = parts.slice(1).pop() || ""; // take last O|... part (latest checkout if many)

    let check_in = null;
    let check_out = null;

    // Parse check in (strip leading 'I|' if present)
    if (checkInPart) {
        const inStr = checkInPart.startsWith("I|") ? checkInPart.slice(2) : checkInPart;
        const inParts = inStr.split("|").map(s => s === "" ? null : s);
        // Expect [time, lat, lng] but be defensive
        const time = inParts[0] || null;
        const lat = inParts[1] != null ? Number(inParts[1]) : null;
        const lng = inParts[2] != null ? Number(inParts[2]) : null;
        check_in = {
            time,
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null
        };
    }

    // Parse check out (we already took last out part)
    if (checkOutPart) {
        // checkOutPart may begin with a time (no leading O|)
        const outParts = checkOutPart.split("|").map(s => s === "" ? null : s);
        const time = outParts[0] || null;
        const lat = outParts[1] != null ? Number(outParts[1]) : null;
        const lng = outParts[2] != null ? Number(outParts[2]) : null;
        check_out = {
            time,
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null
        };
    }

    return { check_in, check_out };
};

const buildDayLogsFromAEntries = (aEntries = []) => {
    const dayLogs = {};

    if (!Array.isArray(aEntries) || aEntries.length === 0) return dayLogs;

    // Ensure we process in ascending id so later/higher id overwrites earlier
    const sortedA = [...aEntries].sort((x, y) => (x.id || 0) - (y.id || 0));

    sortedA.forEach(aEntry => {
        const tsList = Array.isArray(aEntry.ts_data_list) ? aEntry.ts_data_list : [];
        const aEffortForEntry = typeof aEntry.effort === "number" ? aEntry.effort : 0;
        const aNoOfItems = typeof aEntry.no_of_items === "number" ? aEntry.no_of_items : (aEntry.no_of_items ? Number(aEntry.no_of_items) : 0);
        const aRemarks = typeof aEntry.remarks === "string" ? aEntry.remarks : "";

        tsList.forEach(ts => {
            const date = ts?.a_date;
            if (!date) return;

            // Parse geo data (choose last O| part as checkout)
            const { check_in, check_out } = parseGeoData(ts.geo_data || "");

            // Determine effort/no_of_items for this date:
            // Use this A entry's effort/no_of_items ONLY if this a_date is inside this A's date range (inclusive).
            const belongsToThisA =
                isDateInRange(date, aEntry.start_date, aEntry.end_date);

            // Build log (overwrite only if not created, or this A is later)
            const existing = dayLogs[date] || {};

            dayLogs[date] = {
                date,
                check_in,
                check_out,
                remarks: ts?.remarks || aRemarks || "",

                // ↓↓↓ Correct per-day values from the A-entry covering that date ↓↓↓
                effort: belongsToThisA ? aEntry.effort : existing.effort || 0,
                no_of_items: belongsToThisA ? aEntry.no_of_items : existing.no_of_items || 0
            };
        });
    });

    return dayLogs;
};

export const buildActivityGroupMap = (apiData = []) => {
    if (!Array.isArray(apiData) || apiData.length === 0) return [];

    const groups = {}; // key -> { original_P, allAEntries }

    apiData.forEach(item => {
        const key = `${item.activity_id}_${item.order_item_key}`;

        if (!groups[key]) {
            groups[key] = {
                key,
                original_P: null,
                allAEntries: []
            };
        }

        if (item.activity_type === "P") {
            // store planned (if multiple P exist, last one will overwrite; spec expects single P)
            groups[key].original_P = item;
        } else if (item.activity_type === "A") {
            // collect all A entries
            groups[key].allAEntries.push(item);
        }
    });

    // Derive original_A (highest id) and compute some aggregated values per group
    const result = Object.values(groups).map(group => {
        const allA = group.allAEntries || [];
        // pick highest id A as original_A (per CRITICAL RULES)
        const original_A = allA.length === 0 ? null : allA.reduce((prev, curr) => {
            const prevId = Number(prev?.id || 0);
            const currId = Number(curr?.id || 0);
            return currId >= prevId ? curr : prev;
        });

        return {
            key: group.key,
            original_P: group.original_P || null,
            original_A: original_A || null,
            allAEntries: allA
        };
    });

    return result;
};

export const normalizeProjects = (apiData = []) => {
    const groups = buildActivityGroupMap(apiData);
    const todayApiStr = getTodayApiDateStr(); // e.g., "29-Nov-2025"

    // For each grouped item, build the final object following the specification exactly.
    const final = groups.map(group => {
        const P = group.original_P;
        const A = group.original_A;
        const allA = Array.isArray(group.allAEntries) ? group.allAEntries : [];

        // planned dates only from P
        const planned_start_date = P?.start_date || null;
        const planned_end_date = P?.end_date || null;

        // identity fields
        const customer_name = (P?.customer_name) || (A?.customer_name) || null;
        const audit_type = (P?.product_name) || (A?.product_name) || null;
        const activity_id = (P?.activity_id) || (A?.activity_id) || null;
        const order_item_key = (P?.order_item_key) || (A?.order_item_key) || null;
        const project_name = (P?.project_name) || (A?.project_name) || null;
        const activity_name = (P?.activity_name) || (A?.activity_name) || null;

        // Build combined day_logs from ALL A entries (merging by date, latest geo wins)
        const day_logs = buildDayLogsFromAEntries(allA);

        const allDates = Object.keys(day_logs).map(d => parseApiDate(d)).filter(Boolean).sort((a, b) => a - b);

        //actual date from the day_logs
        const actual_start_date = allDates.length ? formatToApiDate(allDates[0]) : null;
        const actual_end_date = allDates.length ? formatToApiDate(allDates[allDates.length - 1]) : null;

        const total_no_of_items = Object.values(day_logs).reduce(
            (sum, d) => sum + (Number(d.no_of_items) || 0),
            0
        );

        // Total effort = sum of effort from ALL A entries (rule 5)
        const totalEffort = allA.reduce((sum, e) => {
            const v = typeof e.effort === "number" ? e.effort : 0;
            return sum + v;
        }, 0);

        // effort_unit: prefer any non-null effort_unit from original_A, else from first A, else null
        const effort_unit = (A && A.effort_unit) ? A.effort_unit :
            (allA.length > 0 && allA.find(a => a.effort_unit)?.effort_unit) || null;

        // Determine 'complete' as per rule: true only if original_A (highest id) has status === "S"
        const complete = !!(A && A.status === "S");

        // Determine project_period_status as per RULE 6
        // - "Completed" → if complete === true OR any A has status === "C" or status_display === "COMPLETED"
        // - "In Progress" → has at least one A, not completed
        // - "Pending" → only P exists AND planned_end_date < today
        // - "Planned" → only P exists AND within/future dates
        let project_period_status = "Planned";
        const anyAHasCompleted = allA.some(x => x && (x.status === "S" || (x.status_display && x.status_display.toUpperCase() === "SUBMITTED")));
        if (complete || anyAHasCompleted) {
            project_period_status = "Completed";
        } else if (allA && allA.length > 0) {
            project_period_status = "In Progress";
        } else if (P) {
            if (planned_end_date) {
                const end = parseApiDate(planned_end_date);
                const today = parseApiDate(todayApiStr);
                if (end && today && end.getTime() < today.getTime()) {
                    project_period_status = "Pending";
                } else {
                    project_period_status = "Planned";
                }
            } else {
                project_period_status = "Planned";
            }
        } else {
            // If neither P nor A exist (shouldn't happen), mark Pending by default
            project_period_status = "Pending";
        }

        // Today's status (for todayApiStr) as per RULE 6 (todaysStatus)
        // - "Complete" → has check-in + check-out today
        // - "Active" → has check-in today but no check-out
        // - "Planned" → no activity today
        const todayLog = day_logs[todayApiStr] || null;
        let todaysStatus = "Planned";
        if (todayLog && todayLog.check_in && todayLog.check_out) {
            todaysStatus = "Complete";
        } else if (todayLog && todayLog.check_in && !todayLog.check_out) {
            todaysStatus = "Active";
        } else {
            todaysStatus = "Planned";
        }

        // Pending checkout detection: any date with check_in but no check_out
        // const pendingDates = Object.keys(day_logs)
        //     .filter(d => {
        //         const l = day_logs[d];
        //         return !!(l && l.check_in && !l.check_out);
        //     })
        //     // sort dates ascending (by parsed date)
        //     .sort((a, b) => {
        //         const pa = parseApiDate(a);
        //         const pb = parseApiDate(b);
        //         if (!pa || !pb) return 0;
        //         return pa.getTime() - pb.getTime();
        //     });

        // const hasPendingCheckout = pendingDates.length > 0;
        // // pendingCheckoutDate: choose the earliest pending date (makes sense for UX). If none -> null
        // const pendingCheckoutDate = hasPendingCheckout ? pendingDates[0] : null;

        // Buttons logic as per RULE 7:
        // - If any date has check_in but no check_out -> hasPendingCheckout = true, show_end_button = true
        // - Else if today has no check_in -> show_start_button = true
        // - Else if today has check_in but no check_out -> show_end_button = true

        // ---- CORRECT PENDING CHECKOUT LOGIC ----

// Convert today's API date to real Date object
const todayObj = parseApiDate(todayApiStr);

// Find ANY previous date with check-in but NO check-out
const hasPreviousDatePendingCheckout = Object.keys(day_logs).some(dateStr => {
    const log = day_logs[dateStr];
    const d = parseApiDate(dateStr);

    if (!log || !d) return false;

    // Strictly BEFORE today
    const isPreviousDate = d.getTime() < todayObj.getTime();

    return isPreviousDate && log.check_in && !log.check_out;
});

// This is your final expected value
const hasPendingCheckout = hasPreviousDatePendingCheckout;

// Earliest previous pending date (optional)
const pendingCheckoutDate = hasPendingCheckout
    ? Object.keys(day_logs)
        .filter(dateStr => {
            const log = day_logs[dateStr];
            const d = parseApiDate(dateStr);

            if (!log || !d) return false;

            return d.getTime() < todayObj.getTime() && log.check_in && !log.check_out;
        })
        .sort((a, b) => parseApiDate(a) - parseApiDate(b))[0]
    : null;

        
        let show_start_button = false;
        let show_end_button = false;
        const hasTodayCheckIn = !!(todayLog && todayLog.check_in);
        const hasTodayCheckOut = !!(todayLog && todayLog.check_out);

        if (hasPendingCheckout && pendingCheckoutDate !== todayApiStr) {
            // end button should be shown to allow completing pending checkout (per spec)
            show_start_button = false;
            show_end_button = true;
        } else if (!hasTodayCheckIn && !hasPendingCheckout) {
            // no one checked in today and no pending elsewhere -> show start
            show_start_button = true;
            show_end_button = false;
        } else if (hasTodayCheckIn && !hasTodayCheckOut) {
            // checked in today but not out -> show end
            show_start_button = false;
            show_end_button = true;
        }else if (hasTodayCheckIn && hasTodayCheckOut) {
            show_start_button = false;
            show_end_button = false;
        }

        // id should be latest A.id or P.id
        const id = (A && A.id) ? A.id : (P && P.id) ? P.id : null;

        // original_P: full original P object or null
        // original_A: full original A object (the highest id) or null
        const original_P = P || null;
        const original_A = A || null;

        return {
            id: id,
            title: project_name,
            customer_name,
            audit_type,
            project_name,
            activity_name,
            activity_id,
            project_code: order_item_key,

            planned_start_date: planned_start_date || null,
            planned_end_date: planned_end_date || null,

            actual_start_date: actual_start_date || null,
            actual_end_date: actual_end_date || null,

            complete: Boolean(complete),

            // todaysStatus must be one of "Active" | "Complete" | "Planned" | "Pending"
            // We already set "Complete", "Active", "Planned". Map "Pending" only if project_period_status === "Pending" AND no activity today
            todaysStatus: (todaysStatus === "Planned" && project_period_status === "Pending") ? "Planned" : todaysStatus,
            project_period_status,

            show_start_button,
            show_end_button,
            hasPendingCheckout,
            pendingCheckoutDate: pendingCheckoutDate || null,

            effort: totalEffort,
            effort_unit: effort_unit || null,

            total_no_of_items,

            day_logs: day_logs,

            original_P,
            original_A
        };
    });

    return final;
};

export const getCurrentDateTimeDefaults = () => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  const yyyy = now.getFullYear()
  const mm = pad(now.getMonth() + 1)
  const dd = pad(now.getDate())
  const todayISO = `${yyyy}-${mm}-${dd}`
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const dayLogKey = `${dd}-${MONTH_SHORT_NAMES[now.getMonth()]}-${yyyy}`
  const apiDate = formatToDDMMYYYY(todayISO)

  return { todayISO, dayLogKey, apiDate, currentTime }
}

 export const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

// Add this function — either in utils.js or inside APMTimeSheet.js (above the component)
export const getDateRangeFromPeriod = (period) => {
  const today = new Date();

  const format = (date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  switch (period) {
    case 'this_week': {
      const startOfWeek = new Date(today);
      const day = today.getDay(); // 0 = Sunday
      startOfWeek.setDate(today.getDate() - day); // Start from Sunday (or change to - (day || 7) for Monday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { startDate: format(startOfWeek), endDate: format(endOfWeek) };
    }

    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: format(firstDay), endDate: format(lastDay) };
    }

    case 'today':
    default: {
      return { startDate: format(today), endDate: format(today) };
    }
  }
};

export const parseDateString = (str) => {
    if (!str) return null;
    const parts = str.split("-");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map(Number);
    if (!dd || !mm || !yyyy) return null;
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d) ? null : d;
  };

  export const DateForApiFormate = (value) => {
    if (!value) return "";

    let d = value;

    // If value is a string → normalize it
    if (typeof value === "string") {
        // Replace "/" with "-" to standardize
        value = value.replace(/\//g, "-");

        const monthNameMap = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
        };

        // Split on "-" (after normalization)
        const parts = value.split("-");

        if (parts.length === 3) {
            let [a, b, c] = parts;

            // Case: "02-Dec-2025"
            if (monthNameMap[b]) {
                d = new Date(Number(c), monthNameMap[b], Number(a));
            }
            // Case: "2025-12-02" (YYYY-MM-DD)
            else if (a.length === 4) {
                d = new Date(Number(a), Number(b) - 1, Number(c));
            }
            // Case: "02-12-2025" (DD-MM-YYYY)
            else {
                d = new Date(Number(c), Number(b) - 1, Number(a));
            }
        } else {
            // Fallback: try JS parser
            d = new Date(value);
        }
    }

    // If not Date or invalid → return ""
    if (!(d instanceof Date) || isNaN(d)) return "";

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
};
