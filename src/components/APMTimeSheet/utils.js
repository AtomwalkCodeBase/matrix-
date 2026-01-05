import moment from "moment";
import { colors } from "../../Styles/appStyle";

const MONTH_SHORT_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_MAP = MONTH_SHORT_NAMES.reduce((acc, m, i) => {
    acc[m.toLowerCase()] = i;
    return acc;
}, {});

export const parseApiDate = (apiDateStr) => {
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

            // Parse geo data
            const { check_in, check_out } = parseGeoData(ts.geo_data || "");

            // Determine effort/no_of_items for this date
            const belongsToThisA = isDateInRange(date, aEntry.start_date, aEntry.end_date);

            if (!dayLogs[date]) {
                dayLogs[date] = {
                    date,
                    sessions: [], // Changed from checkIns/checkOuts to sessions array
                    remarksList: [],
                    effort: 0,
                    no_of_items: 0,
                };
            }
            const current = dayLogs[date];

            // Store as session object instead of separate arrays
            if (check_in || check_out) {
                current.sessions.push({
                    check_in: check_in || null,
                    check_out: check_out || null,
                    no_of_items: ts.no_of_items || 0,
                    geo_data: ts.geo_data || ""
                });
            }

            // Store remarks
            if (ts?.remarks) current.remarksList.push(ts.remarks);
            else if (aRemarks) current.remarksList.push(aRemarks);

            // preserve original effort logic
            if (belongsToThisA) current.effort = aEffortForEntry;

            // preserve original no_of_items logic (sum all items for the date)
            if (belongsToThisA) {
                // Sum no_of_items from all sessions for this date
                const totalItemsForDate = current.sessions.reduce((sum, session) => {
                    return sum + (Number(session.no_of_items) || 0);
                }, 0);
                current.no_of_items = totalItemsForDate;
            }
        });
    });

    // Process each date to create the final structure
    Object.keys(dayLogs).forEach(date => {
        const log = dayLogs[date];

        // Get first check-in and last check-out if available
        const firstSession = log.sessions[0];
        const lastSession = log.sessions[log.sessions.length - 1];
        
        const firstCheckIn = firstSession?.check_in;
        const lastCheckOut = lastSession?.check_out;
        
        // Check if any session is incomplete (has check-in but no check-out)
        const hasIncompleteSession = log.sessions.some(session => 
            session.check_in && !session.check_out
        );

        dayLogs[date] = {
            date,
            sessions: log.sessions, // Keep all sessions
            first_check_in: firstCheckIn || "", // First check-in of the day
            last_check_out: lastCheckOut || "", // Last check-out of the day
            is_incomplete: hasIncompleteSession, // Flag for incomplete sessions
            remarks: log.remarksList.join(", ") || "",
            effort: log.effort,
            no_of_items: log.no_of_items,
        };
    });

    return dayLogs;
};

// const buildDayLogsFromAEntries = (aEntries = []) => {
//     const dayLogs = {};

//     if (!Array.isArray(aEntries) || aEntries.length === 0) return dayLogs;

//     // Ensure we process in ascending id so later/higher id overwrites earlier
//     const sortedA = [...aEntries].sort((x, y) => (x.id || 0) - (y.id || 0));

//     sortedA.forEach(aEntry => {
//         const tsList = Array.isArray(aEntry.ts_data_list) ? aEntry.ts_data_list : [];
//         const aEffortForEntry = typeof aEntry.effort === "number" ? aEntry.effort : 0;
//         const aNoOfItems = typeof aEntry.no_of_items === "number" ? aEntry.no_of_items : (aEntry.no_of_items ? Number(aEntry.no_of_items) : 0);
//         const aRemarks = typeof aEntry.remarks === "string" ? aEntry.remarks : "";

//         tsList.forEach(ts => {
//             const date = ts?.a_date;
//             if (!date) return;

//             // Parse geo data (choose last O| part as checkout)
//             const { check_in, check_out } = parseGeoData(ts.geo_data || "");

//             // Determine effort/no_of_items for this date:
//             // Use this A entry's effort/no_of_items ONLY if this a_date is inside this A's date range (inclusive).
//             const belongsToThisA =
//                 isDateInRange(date, aEntry.start_date, aEntry.end_date);

//             // Build log (overwrite only if not created, or this A is later)
//             // const existing = dayLogs[date] || {};

//             // dayLogs[date] = {
//             //     date,
//             //     check_in,
//             //     check_out,
//             //     remarks: ts?.remarks || aRemarks || "",

//             //     // ↓↓↓ Correct per-day values from the A-entry covering that date ↓↓↓
//             //     effort: belongsToThisA ? aEntry.effort : existing.effort || 0,
//             //     no_of_items: belongsToThisA ? aEntry.no_of_items : existing.no_of_items || 0
//             // };
//              if (!dayLogs[date]) {
//         dayLogs[date] = {
//           date,
//           checkIns: [],
//           checkOuts: [],
//           remarksList: [],
//           effort: 0,
//           no_of_items: 0,
//         };
//       }
//       const current = dayLogs[date];

//        // Store multiple check-in/out values
//       if (check_in) current.checkIns.push(check_in);
//       if (check_out) current.checkOuts.push(check_out);

//       // Store remarks
//       if (ts?.remarks) current.remarksList.push(ts.remarks);
//       else if (aRemarks) current.remarksList.push(aRemarks);

//       // preserve original effort logic
//       if (belongsToThisA) current.effort = aEffortForEntry;

//       // preserve original no_of_items logic
//       if (belongsToThisA) current.no_of_items = aNoOfItems;
//         });
//     });
    
//       Object.keys(dayLogs).forEach(date => {
//     const log = dayLogs[date];

//     const hasCheckout = log.checkOuts.length > 0;

//     dayLogs[date] = {
//       date,
//       check_in: log.checkIns[0] || "",             // First check-in
//       check_out: hasCheckout 
//         ? log.checkOuts[log.checkOuts.length - 1]  // Last checkout if exists
//         : "",

//       remarks: log.remarksList.join(", ") || "",

//       effort: log.effort,
//       no_of_items: log.no_of_items,

//       // 🚀 THIS FIXES YOUR PENDING CHECKOUT ISSUE
//     //   isPendingCheckout: !hasCheckout,
//     };
//       });

//     return dayLogs;
// };

export const buildActivityGroupMap = (apiData = []) => {
  console.log("buildActivityGroupMap called with data length:", apiData.length);
  
  if (!Array.isArray(apiData) || apiData.length === 0) return [];

  // Separate P and A items
  const pItems = apiData.filter(item => item.activity_type === "P");
  const aItems = apiData.filter(item => item.activity_type === "A");
  
  console.log(`P items: ${pItems.length}, A items: ${aItems.length}`);

  const groups = {};
  
  // 1. First handle P items (create groups for all P items)
  pItems.forEach(pItem => {
    // Create a unique key using P's id and order_item_id
    const key = `${pItem.id}_${pItem.order_item_id}`;
    
    if (!groups[key]) {
      groups[key] = {
        key,
        original_P: pItem,
        allAEntries: [],
        order_item_id: pItem.order_item_id,
        order_item_key: pItem.order_item_key // Keep for reference
      };
      console.log(`Created group for P id ${pItem.id}, order_item_id: ${pItem.order_item_id}, order_item_key: ${pItem.order_item_key}`);
    }
  });
  
  // 2. Now assign A items to groups
  aItems.forEach(aItem => {
    // Try to find matching P item by comparing A's free_code with P's id
    const matchingKey = Object.keys(groups).find(key => {
      const group = groups[key];
      // Check if A's free_code matches P's id AND order_item_id matches
      return group.original_P && 
             String(group.original_P.id) === String(aItem.free_code) && 
             group.order_item_id === aItem.order_item_id;
    });
    
    if (matchingKey) {
      // Add A item to existing group
      groups[matchingKey].allAEntries.push(aItem);
      console.log(`Assigned A id ${aItem.id} (free_code: ${aItem.free_code}) to group ${matchingKey}`);
    } else {
      // No matching P found - check if there's an orphan group for this A
      const orphanKey = `orphan_${aItem.id}_${aItem.order_item_id}`;
      if (!groups[orphanKey]) {
        groups[orphanKey] = {
          key: orphanKey,
          original_P: null,
          allAEntries: [aItem],
          order_item_id: aItem.order_item_id,
          order_item_key: aItem.order_item_key // Keep for reference
        };
        console.log(`Created orphan group for A id ${aItem.id}, order_item_id: ${aItem.order_item_id}`);
      } else {
        groups[orphanKey].allAEntries.push(aItem);
      }
    }
  });
  
  // 3. Convert to array and derive original_A
  const result = Object.values(groups).map(group => {
    const allA = group.allAEntries || [];
    
    // Sort A entries by id ascending and pick the highest id as original_A
    const sortedA = [...allA].sort((a, b) => (a.id || 0) - (b.id || 0));
    const original_A = sortedA.length > 0 ? sortedA[sortedA.length - 1] : null;
    
    return {
      key: group.key,
      original_P: group.original_P || null,
      original_A: original_A || null,
      allAEntries: allA,
      order_item_id: group.order_item_id,
      order_item_key: group.order_item_key
    };
  });

  console.log(`Total groups created: ${result.length}`);
  
  // Debug: Show each group
  result.forEach((group, index) => {
    console.log(`Group ${index + 1}:`);
    console.log(`  Key: ${group.key}`);
    console.log(`  Has P: ${group.original_P ? `Yes (id: ${group.original_P.id})` : 'No'}`);
    console.log(`  Has A: ${group.original_A ? `Yes (id: ${group.original_A.id}, free_code: ${group.original_A.free_code})` : 'No'}`);
    console.log(`  order_item_id: ${group.order_item_id}`);
    console.log(`  order_item_key: ${group.order_item_key}`);
    console.log(`  Total A entries: ${group.allAEntries.length}`);
  });
  
  return result;
};

export const normalizeProjects = (apiData = []) => {
  console.log("normalizeProjects called with data length:", apiData.length);
  
  const groups = buildActivityGroupMap(apiData);
  console.log("Groups created:", groups.length);
  
  const todayApiStr = getTodayApiDateStr();
  console.log("Today's API date string:", todayApiStr);
  
  // For each grouped item, build the final object
  const final = groups.map(group => {
    const P = group.original_P;
    const A = group.original_A;
    const allA = Array.isArray(group.allAEntries) ? group.allAEntries : [];
    
    // Generate a unique ID for the project card
    const projectId = P ? `P_${P.id}` : (A ? `A_${A.id}` : `group_${group.key}`);

    // planned dates only from P
    const planned_start_date = P?.start_date || null;
    const planned_end_date = P?.end_date || null;

    // identity fields
    const customer_name = (P?.customer_name) || (A?.customer_name) || null;
    const audit_type = (P?.product_name) || (A?.product_name) || null;
    const activity_id = (P?.activity_id) || (A?.activity_id) || null;
    const order_item_key = (P?.order_item_key) || (A?.order_item_key) || null;
    const order_item_id = (P?.order_item_id) || (A?.order_item_id) || null; // Add this
    const project_name = (P?.project_name) || (A?.project_name) || null;
    const activity_name = (P?.activity_name) || (A?.activity_name) || null;

    // Build combined day_logs from ALL A entries (merging by date, latest geo wins)
    const day_logs = buildDayLogsFromAEntries(allA);

    const allDates = Object.keys(day_logs).map(d => parseApiDate(d)).filter(Boolean).sort((a, b) => a - b);

    // actual date from the day_logs
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
        project_period_status = "Pending";
    }

    // Today's status (for todayApiStr) as per RULE 6 (todaysStatus)
    const todayLog = day_logs[todayApiStr] || null;
    let todaysStatus = "Planned";
    if (todayLog && todayLog.check_in && todayLog.check_out) {
        todaysStatus = "Complete";
    } else if (todayLog && todayLog.check_in && !todayLog.check_out) {
        todaysStatus = "Active";
    } else {
        todaysStatus = "Planned";
    }

    // Pending checkout detection
    const todayObj = parseApiDate(todayApiStr);
    const hasPreviousDatePendingCheckout = Object.keys(day_logs).some(dateStr => {
        const log = day_logs[dateStr];
        const d = parseApiDate(dateStr);
        if (!log || !d) return false;
        const isPreviousDate = d.getTime() < todayObj.getTime();
        return isPreviousDate && log.check_in && !log.check_out;
    });

    const hasPendingCheckout = hasPreviousDatePendingCheckout;
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
        show_start_button = false;
        show_end_button = true;
    } else if (!hasTodayCheckIn && !hasPendingCheckout) {
        show_start_button = true;
        show_end_button = false;
    } else if (hasTodayCheckIn && !hasTodayCheckOut) {
        show_start_button = false;
        show_end_button = true;
    } else if (hasTodayCheckIn && hasTodayCheckOut) {
        show_start_button = false;
        show_end_button = false;
    }

    // original_P: full original P object or null
    // original_A: full original A object (the highest id) or null
    const original_P = P || null;
    const original_A = A || null;

    return {
        id: projectId,
        title: project_name,
        customer_name,
        audit_type,
        project_name,
        activity_name,
        activity_id,
        project_code: order_item_key,
        order_item_id: order_item_id, // Add this field

        planned_start_date: planned_start_date || null,
        planned_end_date: planned_end_date || null,

        actual_start_date: actual_start_date || null,
        actual_end_date: actual_end_date || null,

        complete: Boolean(complete),

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

  console.log(`Normalized ${final.length} projects`);
  return final;
};

export const mapAllocationData = (apiData = []) => {

    if (!Array.isArray(apiData) || apiData.length === 0) {
        return {
            projectsData: [],
            employeeData: []
        };
    }

    const projectMap = {}
    const employeeMap = {}

    /*
      Step 1: Group by
      activity_id + order_item_key + emp_id
      Prefer A over P
    */
    const grouped = {}

    apiData.forEach(item => {
        const key = `${item.activity_id}_${item.order_item_key}_${item.emp_id}`

        if (!grouped[key]) {
            grouped[key] = { P: null, A: null }
        }

        if (item.activity_type === "P") {
            grouped[key].P = item
        }

        if (item.activity_type === "A") {
            if (!grouped[key].A) {
                grouped[key].A = item
            } else {
                grouped[key].A.ts_data_list = [
                    ...(grouped[key].A.ts_data_list || []),
                    ...(item.ts_data_list || [])
                ]
            }
        }
    })

    /*
      Step 2: Build projectMap + employeeMap
    */
    Object.values(grouped).forEach(group => {

        const data = group.A || group.P
        if (!data) return

        const activity_id = data.activity_id
        const order_item_key = data.order_item_key
        const project_name = data.project_name
        const customer_name = data.customer_name
        const audit_type = data.product_name

        const emp_id = data.emp_id
        const employee_name = data.employee_name

        const isWorking = !!group.A  // A = Working | P = Only Assigned

        const planned_start_date = group.P?.start_date || null
        const planned_end_date = group.P?.end_date || null

        const actual_start_date = group.A?.start_date || null
        const actual_end_date = group.A?.end_date || null

        const effort = group.A?.effort || 0
        const effort_unit = group.A?.effort_unit || null

        const complete = !!(group.A && group.A.status === "S");

        const day_logs = buildDayLogsFromAEntries(
            group.A ? [group.A] : [],
            //   group.A?.remarks || group.P?.remarks || ""
        )

        const projectKey = `${activity_id}_${order_item_key}`

        /* =================== EMPLOYEE MAP =================== */
        if (!employeeMap[emp_id]) {
            employeeMap[emp_id] = {
                emp_id,
                employee_name,
                // color: getRandomColor(),   // ✅ Unique color per employee
                projects: []
            }
        }

        // const employeeColor = employeeMap[emp_id].color


        /* =================== PROJECT DATA =================== */
        if (!projectMap[projectKey]) {
            projectMap[projectKey] = {
                activity_id,
                order_item_key,
                project_name,
                audit_type,
                customer_name,

                planned_start_date,
                planned_end_date,

                total_assigned_employees: 0,
                total_working_employees: 0,

                project_status: "planned",
                project_period_status: "Planned",

                teamMembers: [],
                totalHours: 0
            }
        }

        // ✅ Count assigned & working
        projectMap[projectKey].total_assigned_employees += 1
        if (isWorking) {
            projectMap[projectKey].total_working_employees += 1
        }

        // ✅ Update project status if ANY employee is working
        if (isWorking) {
            projectMap[projectKey].project_status = "active"
            projectMap[projectKey].project_period_status = "IN Progress"
        }

        projectMap[projectKey].teamMembers.push({
            emp_id,
            employee_name,
            // color: employeeColor,      // ✅ same color everywhere

            type: isWorking ? "A" : "P",

            activity_status: complete,

            activity_id,
            order_item_key,
            project_name,

            planned_start_date,
            planned_end_date,

            actual_start_date,
            actual_end_date,

            effort,
            effort_unit,

            day_logs
        })

        projectMap[projectKey].totalHours =
            projectMap[projectKey].teamMembers.reduce(
                (sum, m) => sum + (Number(m.effort) || 0),
                0
            );



        /* =================== EMPLOYEE PROJECTS =================== */
        const alreadyAdded = employeeMap[emp_id].projects.some(
            p => p.activity_id === activity_id && p.order_item_key === order_item_key
        )

        if (!alreadyAdded) {
            employeeMap[emp_id].projects.push({
                activity_id,
                order_item_key,
                project_name,
                customer_name,
                audit_type,

                planned_start_date,
                planned_end_date,

                actual_start_date,
                actual_end_date,

                effort,
                effort_unit,

                project_status: isWorking ? "active" : "planned",
                project_period_status: isWorking ? "IN Progress" : "Planned",

                day_logs
            })
             employeeMap[emp_id].projects.totalHoursPerProject =
                 employeeMap[emp_id].projects.reduce(
                    (sum, m) => sum + (Number(m.effort) || 0),
                    0
            );
        }

    })


    return {
        projectsData: Object.values(projectMap),
        employeeData: Object.values(employeeMap)
    }
}

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
     case "yesterday": {
            const y = new Date(today);
            y.setDate(y.getDate() - 1);
            return { startDate: format(y), endDate: format(y) };
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

export const getStatusStyles = (status_display) => {
    const key = status_display.toUpperCase().replace(/\s+/g, "_");

    switch (key) {
      case 'IN_PROGRESS':
        return { bgColor: colors.warning, color: colors.black, borderColor: colors.warning, icon: 'access-time' };
      case 'REJECTED':
        return { bgColor: colors.red, color: colors.white, borderColor: colors.red, icon: 'cancel' };
      case 'CANCELLED':
        return { bgColor: colors.red, color: colors.white, borderColor: colors.red, icon: 'cancel' };
      case 'COMPLETED':
        return { bgColor: colors.green, color: colors.white, borderColor: colors.green, icon: 'check-circle' };
      case 'PLANNED':
        return { bgColor: colors.textSecondary, color: colors.white, borderColor: colors.grey, icon: 'pause' };
      default:
        return { bgColor: colors.textSecondary, color: colors.white, borderColor: colors.grey, icon: 'question-mark' };
    }
  };

export const searchByKeys = (data = [], query = "", keys = []) => {
  if (!query.trim()) return data;

  const q = query.toLowerCase();

  return data.filter(item =>
    keys.some(key =>
      String(item?.[key] ?? "")
        .toLowerCase()
        .includes(q)
    )
  );
};
