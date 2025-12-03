import AsyncStorage from '@react-native-async-storage/async-storage';

// const getDbName = async (path) => {
//   let dbData = await AsyncStorage.getItem('dbName');
//   return dbData
// };
const getDbName = async () => {

  return "APM_002"
};


const localhost = "https://crm.atomwalk.com"
const newlocalhost = "https://crm.atomwalk.com"

const apiURL = "/api";
const apiURLHR = "/hr_api";
const db_name = getDbName();


//End Points
export const endpoint = `${newlocalhost}${apiURL}`;
export const newendpoint = `${newlocalhost}${apiURLHR}`;


//URLs
export const loginURL = `${localhost}/rest-auth/login/`;
export const getDbList = `${endpoint}/get_applicable_site/`;
export const empLoginURL = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/emp_user_login/${db_name}/`;
};
export const profileInfoURL = async () => {
  const db_name = await getDbName();
  return `${endpoint}/profile_info/${db_name}/`;
};
export const profileDtlURL = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_employee_list/${db_name}/`;
};
export const companyInfoURL = async () => {
  const db_name = await getDbName();
  return `${endpoint}/company_info/${db_name}/`;
};
export const getEmpLeavedata = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_employee_leave/${db_name}/`;
};
export const addEmpLeave = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/process_employee_leave/${db_name}/`;
};
export const addClaim = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/add_claim/${db_name}/`;
};
export const processClaim = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/process_claim/${db_name}/`;
};
export const getEmpClaimdata = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_claim_list/${db_name}/`;
};
export const getExpenseItemList = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/expense_item_list/${db_name}/`;
};
export const getProjectList = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_project_list/${db_name}/`;
};
export const getEmpAttendanceData = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_employee_attendance/${db_name}/`;
};
export const getEmpHolidayData = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_holiday_data/${db_name}/`;
};
export const empCheckData = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/process_employee_attendance/${db_name}/`;
};
export const getClaimApproverList = async () => {
  const db_name = await getDbName();
  return `${endpoint}/get_claim_approve_list/${db_name}/`;
};
export const getfiletotext = async () => {
  const db_name = await getDbName();
  return `${endpoint}/get_file_to_text/${db_name}/`;
};
export const processAppointee = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/process_employee_job/${db_name}/`;
};
export const getEmployeeRequestList = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_employee_request/${db_name}/`;
};

export const getEmployeeTravelList = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_travel_request_list/${db_name}/`;
};

export const getTravelMode = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/travel_mode_list/${db_name}/`;
};

export const getEmployeeRequestCategory = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_request_category/${db_name}/`;
};
export const processEmployeeRequest = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/process_employee_request/${db_name}/`;
};
export const getEventtList = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_employee_events/${db_name}/`;
};
export const getEventResponse = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_event_response/${db_name}/`;
};
export const processEventRes = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/process_emp_event_response/${db_name}/`;
};
export const getEmpSal = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_emp_salary_data/${db_name}/`;
};
export const setUserPinURL =  async () => {
  const db_name = await getDbName();
  return `${endpoint}/set_user_pin/${db_name}/`;
}

export const forgetEmpPinURL =  async () => {
  const db_name = await getDbName();
  return `${newendpoint}/emp_forget_pin/${db_name}/`;
}

export const getEmpShiftData = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_emp_shift_data/${db_name}/`;
};

export const getTrainingModuleData = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_training_session_list/${db_name}/`;
};

export const getEmpTrainingListData = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_emp_training_list/${db_name}/`;
};

export const processEmpTraining = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/process_emp_training/${db_name}/`;
};


export const getactivityList = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_activity_list/${db_name}/`;
}

export const getTimeSheetList = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_time_sheet_list/${db_name}/`;
};

export const addTimesheet = async () => {
  const db_name = await getDbName();
  return`${newendpoint}/process_time_sheet/${db_name}/`;
};

export const validateApproveLimit = async () => {
  const db_name = await getDbName();
  return`${newendpoint}/get_claim_approve_limit_data/${db_name}/`;
};

export const postTravelRequest = async () => {
  const db_name = await getDbName();
  return`${newendpoint}/process_travel_request/${db_name}/`;
};

export const getAllocation = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/get_emp_allocation_data/${db_name}/`;
};

export const processAllocation = async () => {
  const db_name = await getDbName();
  return `${newendpoint}/process_emp_allocation/${db_name}/`;
};
