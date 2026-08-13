import { addEmpLeave, getEmpLeavedata, addClaim, getEmpClaimdata, getExpenseItemList, getProjectList, getEmpAttendanceData, getEmpHolidayData, empCheckData, processClaim, getClaimApproverList, getfiletotext, getEmployeeRequestList, getEmployeeRequestCategory, processEmployeeRequest, getEventResponse, processEventRes, getEventtList, setUserPinURL, forgetEmpPinURL, getEmpShiftData, getTrainingModuleData, getEmpTrainingListData, processEmpTraining, getTimeSheetList, getactivityList, getProjectLists, addTimesheet, profileDtlURL, validateApproveLimit, getEmployeeTravelList, getTravelMode, postTravelRequest, getAllocation, processAllocation, getExpensePlannedItemList, processExpensePlannedItemList, employeeTaskAllocationData, processContractAllocation } from "../services/ConstantServies";
import { authAxios, authAxiosFilePost, authAxiosPost, publicAxiosRequest } from "./HttpMethod";

export async function getEmpLeave(leave_type, emp_id) {
  let data = {};
  if (leave_type) data['leave_type'] = leave_type;
  if (emp_id) data['emp_id'] = emp_id;
  const url = await getEmpLeavedata();
  return authAxios(url, data);
}

export async function postEmpLeave(leave_type) {
  let data = {};
  if (leave_type) {
    data['leave_data'] = leave_type;
  }
  const url = await addEmpLeave();
  return authAxiosPost(url, data);
}

export async function postClaim(claim_data) {
  let data = {};
  if (claim_data) {
    data = claim_data;
  }
  const url = await addClaim();
  return authAxiosFilePost(url, claim_data);
}

export async function postClaimAction(claim_type) {
  let data = {};
  if (claim_type) {
    data['claim_data'] = claim_type;
  }
  const url = await processClaim();
  return authAxiosPost(url, data);

}

export async function getClaimApprover() {
  let data = {};
  const url = await getClaimApproverList();
  return authAxios(url, data);
}

export async function getEmpClaim(call_type, emp_id, period) {
  let data = {};
  if (call_type) {
    data['call_mode'] = call_type;
  }
  if (emp_id) {
    data['emp_id'] = emp_id;
  }
  if (period) {
    data['period'] = period;
  }
  const url = await getEmpClaimdata();
  return authAxios(url, data);
}

export async function getExpenseItem() {
  const url = await getExpenseItemList();
  return authAxios(url);
}


export async function getExpenseProjectList() {
  const url = await getProjectList();
  return authAxios(url);
}

export async function validateClaimItem(res) {
  let data = {
    'a_emp_id': res.emp_id,
    'm_claim_id': res.m_claim_id,
  };
  const url = await validateApproveLimit();
  return authAxios(url, data);
}

export async function getEmpAttendance(res) {
  let data = {
    'emp_id': res.eId || res.emp_id,
    'month': res.month,
    'year': res.year
  };
  const url = await getEmpAttendanceData();
  return authAxios(url, data);
}

export async function getEmpHoliday(res) {
  let data = {
    'year': res.year,
    'emp_id': res.eId,
  };

  const url = await getEmpHolidayData();
  return authAxios(url, data);
}

export async function postCheckIn(checkin_data) {
  let data = {};
  if (checkin_data) {
    data['attendance_data'] = checkin_data;
  }
  const url = await empCheckData();

  return authAxiosPost(url, data);
}


export async function imagetotext(Uri) {
  let data = {};
  data = Uri
  const url = await getfiletotext();
  return authAxiosFilePost(url, data);
}

export async function getEmployeeRequest() {
  const url = await getEmployeeRequestList();
  return authAxios(url);
}


export async function getEmployeeTravel(res) {
  const data = {
    emp_id: res,
  };
  const url = await getEmployeeTravelList();
  return authAxios(url, data);
}

export async function getTravelModeList() {
  const url = await getTravelMode();
  return authAxios(url);
}



export async function getRequestCategory() {
  const url = await getEmployeeRequestCategory();
  return authAxios(url);
}

export async function postEmpRequest(request_data) {
  const url = await processEmployeeRequest();
  return authAxiosFilePost(url, request_data);
}


export async function getEvents(params = {}) {
  const data = {
    emp_id: params.emp_id || "",
    event_type: params.event_type || "",
    date_range: params.date_range || 'ALL'
  };
  const url = await getEventtList();
  return authAxios(url, data);
}

export async function getEventsResponse(params = {}) {
  const data = {
    event_id: params.event_id,
  };
  const url = await getEventResponse();
  return authAxios(url, data);
}

export async function processEventResponse(event_data) {
  let data = {};
  if (event_data) {
    data = event_data;
  }
  const url = await processEventRes();
  return authAxiosFilePost(url, data);
}


export async function setUserPinView(o_pin, n_pin, employeeId) {

  const effectiveEmpoyeeId = employeeId;

  let data = {
    u_id: effectiveEmpoyeeId,
    o_pin: o_pin,
    n_pin: n_pin,
    user_type: "EMP",
  };

  const url = await setUserPinURL();
  return authAxiosPost(url, data);
}


export async function forgetUserPinView(data) {
  const url = await forgetEmpPinURL();
  return publicAxiosRequest.post(url, data);
}

export async function getEmpShift(res) {
  let data = {
    'emp_id': res.eId || res.emp_id,
    'w_start': res.w_data,
    // 'year': res.year
  };
  const url = await getEmpShiftData();
  return authAxiosPost(url, data);
}

export async function getTrainingData() {
  const url = await getTrainingModuleData();
  return authAxios(url);
}

export async function getEmpTrainingList(response) {
  let data = {
    'emp_id': response
  }
  const url = await getEmpTrainingListData();
  return authAxios(url, data);
}

export async function EnrollEmpTraining(res) {
  let data = {};
  if (res) {
    data = res;
  }
  const url = await processEmpTraining();
  return authAxiosFilePost(url, data);
}

export async function getTimesheetData(empid, start_date, end_date) {
  let data = {
    'emp_id': empid,
    'start_date': start_date,
    'end_date': end_date,
  };
  const url = await getTimeSheetList();
  return authAxios(url, data)
}

export async function postTimeList(timedata) {
  let data = {};
  if (timedata) {
    data['ts_data'] = timedata;
  }
  const url = await addTimesheet()
  return authAxiosPost(url, data)
}


export async function getActivitylist() {
  const url = await getactivityList();
  return authAxios(url);
}

export async function getProjectlist(empId) {
  let data = {};
  if (empId) {
    data['emp_id'] = empId;
  }
  const url = await getProjectList();
  return authAxios(url, data);
}

export async function getEmplyoeeList(data) {
  const url = await profileDtlURL();
  return authAxios(url, data);
}

export async function postTravel(res) {
  let data = {};
  if (res) {
    data['travel_data'] = res;
  }
  const url = await postTravelRequest();
  // console.log('Data to be sent:', data);
  return authAxiosPost(url, data)
}

export async function getAllocationList(empId, mEmpId, startDate, endDate) {
  let data = {
    start_date: startDate,
    end_date: endDate,
  };
  if (mEmpId) {
    data.m_emp_id = mEmpId;
  }
  if (empId) {
    data.emp_id = empId;
  }
  const url = await getAllocation();
  return authAxios(url, data);
}

export async function getExpensePlannedItem(data) {
  const url = await getExpensePlannedItemList();
  return authAxios(url, data)
}

export async function postExpensePlannedItem(data) {
  const url = await processExpensePlannedItemList();
  // console.log('Data to be sent:', data);
  return authAxiosPost(url, data)
}

export async function postAllocationData(activity_data) {
  const url = await processAllocation();
  return authAxiosFilePost(url, activity_data);
}

export async function getResourceAllocationList(payload) {
  const url = await employeeTaskAllocationData();
  return authAxios(url, payload);
}

export async function processContractEmpAllocation(data) {
  const url = await processContractAllocation();
  return authAxiosFilePost(url, data)
}