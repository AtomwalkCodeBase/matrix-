import moment from "moment";
import { colors } from "../../Styles/appStyle";
import { EMP_TYPE_LABEL } from "./RetainerResourceScreen";

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

export const apiDateToDDMMYYYY = (apiDateStr) => {
  const date = parseApiDate(apiDateStr);
  return date ? formatToDDMMYYYY(date) : "";
};

export const formatAPITime = (time24) => {
  if (!time24) return ""
  const [h, m] = time24.split(":")
  let hours = parseInt(h, 10)
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12 || 12
  return `${hours.toString().padStart(2, "0")}:${m} ${ampm}`
}

export const formatWeekLabel = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  // → "26 Jan – 1 Feb"
};

export const formatMonthLabel = (start) => {
  const d = new Date(start);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  // → "January 2026"
};

export function formatAMPMTime(time) {
  if (!time) {
    return "--"
  }
  // If you pass a time like "13:45" or "01:45 PM"
  return moment(time, ["HH:mm", "hh:mm A"]).format("hh:mm A");
}

export const isDateInRange = (apiDateStr, startApi, endApi) => {
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
  const parts = geoString.split("^O|");
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

//             // Parse geo data
//             const { check_in, check_out } = parseGeoData(ts.geo_data || "");

//             // Determine effort/no_of_items for this date
//             const belongsToThisA = isDateInRange(date, aEntry.start_date, aEntry.end_date);

//             if (!dayLogs[date]) {
//                 dayLogs[date] = {
//                     date,
//                     sessions: [], // Changed from checkIns/checkOuts to sessions array
//                     remarksList: [],
//                     effort: 0,
//                     no_of_items: 0,
//                 };
//             }
//             const current = dayLogs[date];

//             // Store as session object instead of separate arrays
//             if (check_in || check_out) {
//                 current.sessions.push({
//                     check_in: check_in || null,
//                     check_out: check_out || null,
//                     no_of_items: ts.no_of_items || 0,
//                     geo_data: ts.geo_data || ""
//                 });
//             }

//             // Store remarks
//             if (ts?.remarks) current.remarksList.push(ts.remarks);
//             else if (aRemarks) current.remarksList.push(aRemarks);

//             // preserve original effort logic
//             if (belongsToThisA) current.effort = aEffortForEntry;

//             // preserve original no_of_items logic (sum all items for the date)
//             if (belongsToThisA) {
//                 // Sum no_of_items from all sessions for this date
//                 const totalItemsForDate = current.sessions.reduce((sum, session) => {
//                     return sum + (Number(session.no_of_items) || 0);
//                 }, 0);
//                 current.no_of_items = totalItemsForDate;
//             }
//         });
//     });

//     // Process each date to create the final structure
//     Object.keys(dayLogs).forEach(date => {
//         const log = dayLogs[date];

//         // Get first check-in and last check-out if available
//         const firstSession = log.sessions[0];
//         const lastSession = log.sessions[log.sessions.length - 1];

//         const firstCheckIn = firstSession?.check_in;
//         const lastCheckOut = lastSession?.check_out;

//         // Check if any session is incomplete (has check-in but no check-out)
//         const hasIncompleteSession = log.sessions.some(session => 
//             session.check_in && !session.check_out
//         );

//         dayLogs[date] = {
//             date,
//             sessions: log.sessions, // Keep all sessions
//             first_check_in: firstCheckIn || "", // First check-in of the day
//             last_check_out: lastCheckOut || "", // Last check-out of the day
//             is_incomplete: hasIncompleteSession, // Flag for incomplete sessions
//             remarks: log.remarksList.join(", ") || "",
//             effort: log.effort,
//             no_of_items: log.no_of_items,
//         };
//     });

//     return dayLogs;
// };
const buildDayLogsFromAEntries = (aEntries = []) => {
  const dayLogs = {};
  const dateCounters = {}; // track section count per date

  if (!Array.isArray(aEntries) || aEntries.length === 0) return dayLogs;

  const sortedA = [...aEntries].sort((x, y) => (x.id || 0) - (y.id || 0));

  sortedA.forEach(aEntry => {
    const tsList = Array.isArray(aEntry.ts_data_list) ? aEntry.ts_data_list : [];

    // const aEffort = typeof aEntry.effort === "number" ? aEntry.effort : 0;

    const aRemarks = typeof aEntry.remarks === "string" ? aEntry.remarks : "";

    tsList.forEach(ts => {
      const date = ts?.a_date;
      if (!date) return;

      // increment section counter
      dateCounters[date] = (dateCounters[date] || 0) + 1;
      const section = dateCounters[date];

      const logKey =
        section === 1 ? date : `${date} (session ${section})`;

      const { check_in, check_out } = parseGeoData(ts.geo_data || "");

      const tsNoOfItems = typeof ts.no_of_items === "number" ? ts.no_of_items : Number(ts.no_of_items || 0);
      const tsStatus = ts.status;
      const tsEffort = ts.effort

      const belongsToThisA = isDateInRange(
        date,
        aEntry.start_date,
        aEntry.end_date
      );

      dayLogs[logKey] = {
        date,
        section: logKey,
        check_in: check_in || "",
        check_out: check_out || "",
        remarks: ts?.remarks || aRemarks || "",
        effort: tsEffort || 0,
        no_of_items: belongsToThisA ? tsNoOfItems : 0,
        timeSheetStatus: tsStatus ? tsStatus : "",
      };
    });
  });

  return dayLogs;
};

export const buildActivityGroupMap = (apiData = []) => {
  if (!Array.isArray(apiData) || apiData.length === 0) return [];

  // Separate P and A items
  const pItems = apiData.filter(item => item.activity_type === "P");
  const aItems = apiData.filter(item => item.activity_type === "A");

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
        order_item_key: pItem.order_item_key
      };
    }
  });

  // 2. Now assign A items to groups
  aItems.forEach(aItem => {
    // Try to find matching P item by comparing A's free_code with P's id
    let matchingKey = null;

    // First, check if free_code matches any P's id
    if (aItem.ref_p_id) {
      matchingKey = Object.keys(groups).find(key => {
        const group = groups[key];
        return group.original_P &&
          String(group.original_P.id) === String(aItem.ref_p_id);
      });
    }

    // If no match by free_code, try by order_item_id (fallback)
    if (!matchingKey && aItem.order_item_id) {
      matchingKey = Object.keys(groups).find(key => {
        const group = groups[key];
        return group.order_item_id === aItem.order_item_id;
      });
    }

    if (matchingKey) {
      // Add A item to existing group
      groups[matchingKey].allAEntries.push(aItem);
    } else {
      // No matching P found - create orphan group for this A
      const orphanKey = `orphan_A_${aItem.id}`;
      if (!groups[orphanKey]) {
        groups[orphanKey] = {
          key: orphanKey,
          original_P: null,
          allAEntries: [aItem],
          order_item_id: aItem.order_item_id,
          order_item_key: aItem.order_item_key
        };
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

  return result;
};

export const normalizeProjects = (apiData = []) => {
  const groups = buildActivityGroupMap(apiData);
  const todayApiStr = getTodayApiDateStr();

  const final = groups.map(group => {
    const P = group.original_P;
    const A = group.original_A;
    const allA = Array.isArray(group.allAEntries) ? group.allAEntries : [];

    const sortedActivities = [...allA].sort((a, b) => {
      const dateA = parseApiDate(a.start_date);
      const dateB = parseApiDate(b.start_date);
      if (dateA && dateB) {
        return dateB - dateA;
      }
      return (b.id || 0) - (a.id || 0);
    });

    const latestActivity = sortedActivities[0];
    const projectId = P ? `P_${P.id}` : (A ? `A_${A.id}` : `group_${group.key}`);

    const planned_start_date = P?.start_date || null;
    const planned_end_date = P?.end_date || null;

    const p_id = (P?.id) || null;
    const a_id = (latestActivity?.id) || (A?.id) || null;
    const customer_name = (P?.customer_name) || (A?.customer_name) || null;
    const audit_type = (P?.product_name) || (A?.product_name) || null;
    const activity_id = (P?.activity_id) || (A?.activity_id) || null;
    const order_item_key = (P?.order_item_key) || (A?.order_item_key) || null;
    const order_item_id = (P?.order_item_id) || (A?.order_item_id) || null;
    const project_name = (P?.project_name) || (A?.project_name) || null;
    const activity_name = (P?.activity_name) || (A?.activity_name) || null;
    const location = (P?.store_name) || (A?.store_name) || "";
    const is_ope_actual = (P?.is_ope_actual) || (A?.is_ope_actual);
    const order_item_status = (P?.order_item_status) || (A?.order_item_status);
    const ope_amt = (A?.ope_amt);

    const day_logs = buildDayLogsFromAEntries(allA);
    const allDates = Object.keys(day_logs).map(d => parseApiDate(d)).filter(Boolean).sort((a, b) => a - b);

    const actual_start_date = allDates.length ? formatToApiDate(allDates[0]) : null;
    const actual_end_date = allDates.length ? formatToApiDate(allDates[allDates.length - 1]) : null;

    const total_no_of_items = Object.values(day_logs).reduce(
      (sum, d) => sum + (Number(d.no_of_items) || 0),
      0
    );

    const totalEffort = allA.reduce((sum, e) => {
      const v = typeof e.effort === "number" ? e.effort : 0;
      return sum + v;
    }, 0);

    const effort_unit = (latestActivity && latestActivity.effort_unit) ? latestActivity.effort_unit :
      (allA.length > 0 && allA.find(a => a.effort_unit)?.effort_unit) || null;

    let project_period_status = "Planned";
    let complete = false;
    let isParentCompleted = false;

    // Determine status based on Parent (P) activity_type
    if (P && P.activity_type === "P") {
      // Check if Parent status is Completed (other than "S")
      if (P.status !== "S") {
        // Parent status is "C" or other - COMPLETED
        project_period_status = "Completed";
        complete = true;
        isParentCompleted = true;
      } else {
        // Parent status is "S" - Check if there are any Activity entries
        const hasActivityEntries = allA && allA.length > 0;

        if (hasActivityEntries) {
          // Has Activity entries - IN PROGRESS
          project_period_status = "In Progress";
          complete = false;
          isParentCompleted = false;
        } else {
          // No Activity entries - PLANNED
          project_period_status = "Planned";
          complete = false;
          isParentCompleted = false;
        }
      }
    } else if (latestActivity) {
      // For Activity (A) records without parent
      const hasAnyActivity = latestActivity.ts_data_list && latestActivity.ts_data_list.length > 0;
      if (hasAnyActivity) {
        project_period_status = "In Progress";
        complete = false;
      } else {
        project_period_status = "Planned";
        complete = false;
      }
    } else {
      project_period_status = "Pending";
    }

    // Today's status - only relevant for Activity (A) records
    let todaysStatus = "Planned";
    const todayLog = day_logs[todayApiStr] || null;

    if (todayLog && todayLog.check_in && todayLog.check_out) {
      todaysStatus = "Complete";
    } else if (todayLog && todayLog.check_in && !todayLog.check_out) {
      todaysStatus = "Active";
    }

    // Pending checkout detection - only for Activity records
    const todayObj = parseApiDate(todayApiStr);
    let hasPendingCheckout = false;
    let pendingCheckoutDate = null;

    if (!isParentCompleted && latestActivity?.ts_data_list) {
      const pendingEntry = latestActivity.ts_data_list.find(entry => {
        const entryDate = parseDateString(entry.a_date);
        if (!entryDate) return false;
        const isPreviousDate = entryDate.getTime() < todayObj.getTime();
        if (!isPreviousDate) return false;

        if (entry.geo_data) {
          const hasCheckIn = entry.geo_data.includes('I|');
          const hasCheckOut = entry.geo_data.includes('O|') && !entry.geo_data.includes('O||');
          return hasCheckIn && !hasCheckOut;
        }
        return false;
      });

      if (pendingEntry) {
        hasPendingCheckout = true;
        pendingCheckoutDate = pendingEntry.a_date;
      }
    }

    if (!hasPendingCheckout && !isParentCompleted) {
      const pendingDate = Object.keys(day_logs).find(dateStr => {
        const log = day_logs[dateStr];
        const d = parseApiDate(dateStr);
        if (!log || !d) return false;
        const isPreviousDate = d.getTime() < todayObj.getTime();
        return isPreviousDate && log.check_in && !log.check_out;
      });

      if (pendingDate) {
        hasPendingCheckout = true;
        if (pendingDate) {
          hasPendingCheckout = true;
          pendingCheckoutDate = day_logs[pendingDate].date;
        }
        // pendingCheckoutDate = pendingDate;

      }
    }

    // Button visibility logic
    let show_start_button = false;
    let show_end_button = false;
    let show_details_only = false;

    // If Parent is Completed, only show Details button
    if (isParentCompleted) {
      show_details_only = true;
      show_start_button = false;
      show_end_button = false;
    } else {
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
    }

    const original_P = P || null;
    const original_A = latestActivity || A || null;

    return {
      id: projectId,
      title: project_name,
      a_id: a_id,
      p_id: p_id,
      customer_name,
      audit_type,
      project_name,
      activity_name,
      activity_id,
      order_item_key: order_item_key,
      order_item_id: order_item_id,

      planned_start_date: planned_start_date || null,
      planned_end_date: planned_end_date || null,

      actual_start_date: actual_start_date || null,
      actual_end_date: actual_end_date || null,
      is_ope_actual: is_ope_actual || false,
      order_item_status: order_item_status,
      ope_amt: ope_amt,
      location: location,

      complete: complete,
      isParentCompleted: isParentCompleted,

      todaysStatus: (todaysStatus === "Planned" && project_period_status === "Pending") ? "Planned" : todaysStatus,
      project_period_status,

      show_start_button,
      show_end_button,
      show_details_only,
      hasPendingCheckout,
      pendingCheckoutDate: pendingCheckoutDate || null,

      effort: totalEffort,
      effort_unit: effort_unit || null,

      total_no_of_items,

      day_logs: day_logs,

      original_P,
      original_A,
      all_activities: sortedActivities
    };
  });
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

    const complete = !!(group.A && group.A.status !== "N");

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

export const normalizeToDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";

  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  }

  const match = dateStr.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) {
    const [, day, mon, year] = match;
    const monthIndex = MONTH_SHORT_NAMES.findIndex(
      m => m.toLowerCase() === mon.toLowerCase()
    );

    if (monthIndex !== -1) {
      const month = String(monthIndex + 1).padStart(2, "0");
      return `${day}-${month}-${year}`;
    }
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed)) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return dateStr;
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

    case 'previous_week':
    case 'last_week': {
      const startOfPrevWeek = new Date(today);
      const day = today.getDay(); // 0 = Sunday
      // Go back to this week's Sunday, then -7 days
      startOfPrevWeek.setDate(today.getDate() - day - 7);
      const endOfPrevWeek = new Date(startOfPrevWeek);
      endOfPrevWeek.setDate(startOfPrevWeek.getDate() + 6);
      return { startDate: format(startOfPrevWeek), endDate: format(endOfPrevWeek) };
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

export const DateForApiFormate = (value, returnComparable = false) => {
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

  if (returnComparable) {
    return `${yyyy}-${mm}-${dd}`;
  }

  return `${dd}-${mm}-${yyyy}`;
};

export const getStatusStyles = (status_display) => {
  const key = status_display.toUpperCase().replace(/\s+/g, "_");

  switch (key) {
    case 'IN_PROGRESS':
      return { bgColor: colors.lightblue, color: colors.black, borderColor: colors.lightblue, icon: 'access-time' };
    case 'REJECTED':
      return { bgColor: colors.danger, color: colors.white, borderColor: colors.danger, icon: 'cancel' };
    case 'CANCELLED':
      return { bgColor: colors.danger, color: colors.white, borderColor: colors.danger, icon: 'cancel' };
    case 'COMPLETED':
      return { bgColor: colors.success, color: colors.white, borderColor: colors.success, icon: 'check-circle' };
    case 'PLANNED':
      return { bgColor: colors.grey, color: colors.black, borderColor: colors.grey, icon: 'pause' };
    case 'SUBMITTED':
      return { bgColor: colors.warning, color: colors.white, borderColor: colors.warning, icon: 'pause' };
    case 'PENDING':
      return { bgColor: colors.warning, color: colors.white, borderColor: colors.warning, icon: 'pause' };
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

export const searchEmployeesBase = (data = [], query = "") => {
  if (!query.trim()) return data;

  const q = query.toLowerCase();

  return data
    .map(emp => {
      const empMatch =
        emp.employee_name?.toLowerCase().includes(q) ||
        emp.emp_id?.toLowerCase().includes(q);

      const matchedCustomers = (emp.customers || []).filter(cust =>
        cust.customer_name?.toLowerCase().includes(q)
      );

      // If employee matches → keep all customers
      if (empMatch) {
        return emp;
      }

      // If customer matches → keep only matched customers
      if (matchedCustomers.length > 0) {
        return {
          ...emp,
          customers: matchedCustomers
        };
      }

      return null;
    })
    .filter(Boolean);
};


export const getMonthRange = ({ type = "current", mode = "month", offset = 0, weekStartsOn = 0, } = {}) => {
  const today = new Date();

  let direction = 0;
  if (type === "previous") direction = -1;
  if (type === "next") direction = 1;
  if (type === "current") direction = 0;

  const finalOffset = direction + offset;

  let start = new Date(today);
  let end = new Date(today);

  if (mode === "month") {
    // Move to target month
    start.setMonth(today.getMonth() + finalOffset, 1);
    end.setMonth(today.getMonth() + finalOffset + 1, 0); // last day of that month
  }
  else if (mode === "week") {
    const currentDay = today.getDay();
    // How many days to subtract to reach the start of the week
    const diffToWeekStart = (currentDay - weekStartsOn + 7) % 7;

    // Go to start of current week, then apply offset
    start.setDate(today.getDate() - diffToWeekStart + finalOffset * 7);

    end = new Date(start);
    end.setDate(start.getDate() + 6);
  }
  else {
    throw new Error(`Unsupported mode: "${mode}". Use "month" or "week".`);
  }

  const format = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return {
    start: format(start),
    end: format(end),
  };
};

const isPastDate = (dateStr) => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  return date < today;
};

export const mapEmployeeCustomerOrderItemData = (apiData = []) => {
  if (!Array.isArray(apiData) || apiData.length === 0) return [];

  const employeeMap = {};

  /* ---------------------------------------------------
     STEP 1: Separate P and A entries
  --------------------------------------------------- */
  const plannedMap = {};
  const actualMap = {};

  apiData.forEach(item => {
    if (item.activity_type === "P") {
      plannedMap[item.id] = item;
    }

    if (item.activity_type === "A") {
      const pId = String(item.free_code || "");
      if (!actualMap[pId]) actualMap[pId] = [];
      actualMap[pId].push(item);
    }
  });

  /* ---------------------------------------------------
     STEP 2: Process Planned (P) and attach Actual (A)
  --------------------------------------------------- */
  Object.values(plannedMap).forEach(P => {
    const emp_id = P.emp_id;
    const employee_name = P.employee_name;
    const customer_name = P.customer_name;
    const order_item_id = P.order_item_id;

    const A = (actualMap[String(P.id)] || []).find(
      a => a.order_item_id === P.order_item_id
    ) || null;

    /* ---------- Employee ---------- */
    if (!employeeMap[emp_id]) {
      employeeMap[emp_id] = {
        emp_id,
        employee_name,
        customers: {}
      };
    }

    /* ---------- Customer ---------- */
    if (!employeeMap[emp_id].customers[customer_name]) {
      employeeMap[emp_id].customers[customer_name] = {
        customer_name,
        order_items: {}
      };
    }

    const customerNode = employeeMap[emp_id].customers[customer_name];

    /* ---------- Order Item ---------- */
    if (!customerNode.order_items[order_item_id]) {
      customerNode.order_items[order_item_id] = {
        order_item_id,
        order_item_key: P.order_item_key,

        /* common / lifted fields */
        p_id: P.id || null,
        a_id: A?.id || null,
        activity_id: P.activity_id,

        project_name: P.project_name,
        customer_name: P.customer_name,
        audit_type: P.product_name || A?.product_name || "",
        audit_item_no_planned: P.no_of_items || 0,
        audit_item_no_actual: A?.no_of_items || 0,
        location: P.store_name || A?.store_name || "",
        remarks: P.store_remarks || "",

        planned_start_date: P.start_date || null,
        planned_end_date: P.end_date || null,
        planned_start_time: P.start_time || null,
        planned_end_time: P.end_time || null,
        actual_start_date: A?.start_date || null,
        actual_end_date: A?.end_date || null,

        order_item_complete_status: A
          ? A.status !== "N"
            ? "completed"
            : "in progress"
          : isPastDate(P.start_date)
            ? "pending"
            : "planned",


        /* PLANNED */
        planned: {
          exists: true,
          effort: P.effort || 0,
          effort_unit: P.effort_unit || null,
          remarks: P.remarks || "",
          original_P: P
        },

        /* ACTUAL */
        actual: A
          ? {
            exists: true,
            effort: A.effort || 0,
            effort_unit: A.effort_unit || null,
            status: A.status || "",
            start_date: A.start_date || null,
            end_date: A.end_date || null,
            day_logs: buildDayLogsFromAEntries([A]),
            submitted_file: A.submitted_file || null,
            original_A: A
          }
          : {
            exists: false,
            original_A: null
          }
      };
    }
  });

  /* ---------------------------------------------------
     STEP 3: Convert maps → arrays
  --------------------------------------------------- */
  return Object.values(employeeMap).map(emp => ({
    ...emp,
    customers: Object.values(emp.customers).map(cust => ({
      ...cust,
      order_items: Object.values(cust.order_items)
    }))
  }));
};

export const normalizeDate = (d) => {
  const date =
    d instanceof Date ? d : parseApiDate(d);

  if (!date) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};


const getTodayActionFlags = ({ allAEntries }) => {
  const today = normalizeDate(new Date());

  // Find A started today
  const todayA = allAEntries.find(
    a => normalizeDate(a.start_date) === today
  );

  // 1️⃣ No A for today → Start
  if (!todayA) {
    return {
      showStartBtn: true,
      showCompleteBtn: false
    };
  }

  // 2️⃣ A exists & not completed → Complete
  if (todayA.status === "N") {
    return {
      showStartBtn: false,
      showCompleteBtn: true
    };
  }

  // 3️⃣ A exists & completed → Nothing
  return {
    showStartBtn: false,
    showCompleteBtn: false
  };
};

const toApiDateFromString = (dateStr) => {
  const d = new Date(dateStr);
  return isNaN(d) ? null : formatToApiDate(d);
};


const buildDayLogsFromAEntriesForRetainer = (allAEntries = []) => {
  return allAEntries.reduce((acc, entry) => {
    if (!entry.start_date) return acc;

    const dayKey = toApiDateFromString(entry.start_date);

    if (!acc[dayKey]) {
      acc[dayKey] = {
        date: dayKey,
        section: dayKey,
        remarks: entry.remarks || "",
        effort: 0,
        no_of_items: 0,
        resourceList: entry.resource_list,
      };
    }

    acc[dayKey].effort += Number(entry.effort || 0);
    acc[dayKey].no_of_items += Number(entry.no_of_items || 0);

    return acc;
  }, {});
};

export const formatRetainerActivities = (apiData = []) => {
  const grouped = buildActivityGroupMap(apiData);

  return grouped.map(group => {
    const { original_P, original_A, allAEntries, key } = group;

    const ui = getTodayActionFlags({ allAEntries });
    const day_logs = buildDayLogsFromAEntriesForRetainer(allAEntries);

    return {
      key,

      p_id: original_P?.id ?? null,
      a_id: original_A?.id ?? null,

      employee_name: original_P?.employee_name ?? "",
      emp_id: original_P?.emp_id ?? "",
      customer_name: original_P?.customer_name ?? "",
      product_name: original_P?.product_name ?? "",
      project_name: original_P?.project_name ?? "",
      activity_name: original_P?.activity_name ?? "",
      order_item_id: original_P?.order_item_id ?? "",
      order_item_key: original_P?.order_item_key ?? "",

      planned_start_date: original_P?.start_date || null,
      planned_end_date: original_P?.end_date || null,
      planned_start_time: original_P?.start_time || null,
      planned_end_time: original_P?.end_time || null,

      actual_start_date: original_A?.start_date || null,
      actual_end_date: original_A?.end_date || null,

      is_file_applicable: original_P?.is_file_applicable ?? false,
      audit_type: original_P?.audit_type ?? "",
      store_name: original_P?.store_name ?? "",
      store_remarks: original_P?.store_remarks ?? "",

      complete: original_A?.status && original_A.status !== "N" ? "In Progress" : "Completed",

      original_P,
      original_A,
      allAEntries,

      day_logs,

      ui
    };
  });
};

export const buildEmployeePayload = (resource, today, mode) => {

  if (mode === "UPDATE" && resource.id && resource.is_present === false) {
    return {
      id: resource.id,
      is_deleted: true,
      emp_type: resource.emp_type === "TL" ? "T" : "E",
    };
  }

  return {
    ...(mode === "UPDATE" && resource.id && {
      id: resource.id,
      is_update: true,
    }),

    emp_id: resource.actual_emp_id,
    emp_type: resource.emp_type === "TL" ? "T" : "E",
    contract_rate: resource.contract_rate,
    a_quantity: resource.items ?? resource.a_quantity ?? "",
    start_date: today,
    end_date: today,
    remarks: resource.remarks,
    is_present: resource.is_present === true,
  };
};

const parseResourceListEntry = (entry) => {
  const [name = "", items = "", type = "", empId = ""] = String(entry || "").split("^");
  return {
    name: name.trim(),
    items: items.trim(),
    type: type.trim(),
    empId: empId.trim(),
  };
};

const findResourceListEntry = (empIdMap, fallbackMap, empId, name, type) => {
  if (empId?.trim()) {
    const found = empIdMap.get(empId.trim());
    if (found) return found;
  }

  if (!name?.trim() || !type?.trim()) return null;
  return fallbackMap.get(`${name.trim().toLowerCase()}|${type.trim().toUpperCase()}`) || null;
};

const mapAllocationToResource = (item, empIdMap, fallbackMap) => {
  const itemType = EMP_TYPE_LABEL[item.emp_type] ?? item.emp_type;
  const rlEntry = findResourceListEntry(empIdMap, fallbackMap, item.emp_id, item.employee_name, itemType);
  const isPresentVal = item.is_present !== undefined && item.is_present !== null ? (item.is_present === true || item.is_present === 1 || item.is_present === "1" || item.is_present === "Y" || item.is_present === "true") : true;
  return {
    id: item.id ?? null,
    allocation_id: item.allocation_id,
    planned_emp_id: item.emp_id,
    actual_emp_id: item.emp_id,
    employee_name: item.employee_name,
    actual_name: item.employee_name,
    emp_type: itemType,
    contract_rate: item.contract_rate ?? "",
    items: item.a_quantity ?? rlEntry?.items ?? "",
    a_quantity: item.a_quantity ?? "",
    remarks: item.remarks ?? "",
    isReplacement: false,
    isUpdate: false,
    is_present: isPresentVal,
  };
};

export const mergeResourceData = (plannedResources = [], actualResources = [], resourceList = []) => {
  const actualMap = new Map(actualResources.map(item => [item.emp_id, item]));
  const parsedResourceList = Array.isArray(resourceList)
    ? resourceList.map(parseResourceListEntry)
    : [];

  const empIdMap = new Map(
    parsedResourceList
      .filter(item => item.empId)
      .map(item => [item.empId, item])
  );

  const fallbackMap = new Map(
    parsedResourceList
      .filter(item => !item.empId && item.name && item.type)
      .map(item => [`${item.name.toLowerCase()}|${item.type.toUpperCase()}`, item])
  );
  return plannedResources.map(planned => {
    const actual = actualMap.get(planned.emp_id);

    if (!actual) {
      return mapAllocationToResource(planned, empIdMap, fallbackMap);
    }

    const actualType = EMP_TYPE_LABEL[actual.emp_type] ?? actual.emp_type;
    const rlEntry = findResourceListEntry(empIdMap, fallbackMap, actual.emp_id, actual.employee_name, actualType);
    const isPresentVal = actual.is_present !== undefined && actual.is_present !== null ? (actual.is_present === true || actual.is_present === 1 || actual.is_present === "1" || actual.is_present === "Y" || actual.is_present === "true") : true;


    return {
      id: actual.id,
      allocation_id: planned.allocation_id,
      planned_emp_id: planned.emp_id,
      employee_name: planned.employee_name,
      actual_emp_id: actual.emp_id,
      actual_name: actual.employee_name,
      emp_type: actualType,
      items: actual.a_quantity ?? rlEntry?.items ?? "",
      a_quantity: actual.a_quantity ?? "",
      remarks: actual.remarks ?? "",
      isReplacement: planned.emp_id !== actual.emp_id,
      isUpdate: false,
      is_present: isPresentVal,
      plan_is_approved: planned.is_approved,
      actual_is_approved: actual.is_approved,
      plan_is_present: planned.is_present,
      actual_is_present: isPresentVal,
      contract_rate: actual.contract_rate ?? planned.contract_rate ?? "",
    };
  });

};

export const findCurrentDateEntry = (allAEntries = [], targetDateStr) => {
  const target = DateForApiFormate(targetDateStr, true); // "YYYY-MM-DD", comparable

  return allAEntries.find(entry => {
    const start = DateForApiFormate(entry.start_date, true);
    const end = DateForApiFormate(entry.end_date, true);
    if (!start || !end || !target) return false;
    return target >= start && target <= end;
  }) ?? null;
};