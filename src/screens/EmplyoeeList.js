import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import { AntDesign, Feather, FontAwesome, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { getEmplyoeeList } from '../services/productServices';
import HeaderComponent from '../components/HeaderComponent';
import Loader from '../components/old_components/Loader';
import { useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilterModal from '../components/FilterModal';
import { colors } from '../Styles/appStyle';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EmployeeListScreen = () => {
	const navigate = useNavigation();
	const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({ departments: "", grades: "" });
  const [pendingFilters, setPendingFilters] = useState({ departments: "", grades: "" });
  
  
  const appliedFilterCount = Object.values(filters).filter(v => v && v !== "").length;
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           employee.emp_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = !filters.grades || employee.grade_name === filters.grades;
      const matchesDepartment = !filters.departments || employee.department_name === filters.departments;

      
      return matchesSearch && matchesGrade && matchesDepartment;
    });
  }, [employees, searchQuery,filters]);
  
const handleTimesheetPress = (employee) => {
  router.push({
    pathname: 'TimeSheet',
    params: {
      employee: JSON.stringify(employee),
    },
  });
};

const DropdownOptions = (data, labelKey, valueKey) => {
  const seen = new Set();
  return data
    .filter(item => {
      const value = item[valueKey];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .map(item => ({
      label: item[labelKey],
      value: item[valueKey],
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};


const filterConfigs = useMemo(() => [
  {
    label: "Department",
    options: DropdownOptions(employees, "department_name", "department_name"),
    value: pendingFilters.departments,
    setValue: (value) =>
      setPendingFilters((prev) => ({ ...prev, departments: value })),
  },
  {
    label: "Grade",
    options: DropdownOptions(employees, "grade_name", "grade_name"),
    value: pendingFilters.grades,
    setValue: (value) =>
      setPendingFilters((prev) => ({ ...prev, grades: value })),
  },
], [pendingFilters, employees]);



    const clearFilters = () => {
      setSearchQuery('');
      setFilters({
        grades: '',
        departments: '',
      });
    };

	  useEffect(() => {
		fetchEmployeeList()
	  }, []);

	  const fetchEmployeeList = async () => {
		setLoading(true)
		try {
		  const res = await getEmplyoeeList();
		setEmployees(res.data);
		} catch (err) {
		  console.error("Error fetching activities:", err);
		  Alert.alert('Error', 'Failed to fetch activities');
		}finally{
			setLoading(false)
		}
	  };

  const renderEmployeeCard = ({ item: employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.cardHeader}>
        <View style={styles.employeeInfo}>
          <View style={styles.avatarContainer}>
            {employee.image ? (
              <Image source={{ uri: employee.image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
				<AntDesign name="user" size={20} color={colors.primary} />
              </View>
            )}
            {employee.is_manager && (
              <View style={styles.managerBadge}>
				<Feather name="award" size={12} color="#fff" />
              </View>
            )}
          </View>
          
          <View style={styles.employeeDetails}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            <Text style={styles.employeeId}>{employee.emp_id}</Text>
            <View style={styles.badgeContainer}>
              <View style={styles.gradeBadge}>
                <Text style={styles.badgeText}>{employee.grade_name}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
		  <FontAwesome name="building-o" size={16} color="#666" />
          <Text style={styles.infoText}>{employee.department_name}</Text>
        </View>
        
        <View style={styles.infoRow}>
		  <Feather name="mail" size={16} color="#666" />
          <Text style={styles.infoText}>{employee.email_id}</Text>
        </View>
        
       {employee.mobile_number &&
        <View style={styles.infoRow}>
		      <Feather name="phone" size={16} color="#666" />
          <Text style={styles.infoText}>{employee.mobile_number}</Text>
        </View>}
        
        <View style={styles.infoRow}>
          {employee.date_of_join && <>
		        <AntDesign name="calendar" size={16} color="#666" />
            <Text style={styles.infoText}>Joined: {employee.date_of_join}</Text>
          </>}
		  <TouchableOpacity
          style={styles.timesheetButton}
          onPress={() => handleTimesheetPress(employee)}
        >
		      <MaterialCommunityIcons name="timetable" size={16} color="#fff" />
          {/* <Text style={styles.timesheetButtonText}>Timesheet</Text> */}
        </TouchableOpacity>
        </View>
      </View>
	  
    </View>
  );

    const openFilterModal = () => {
    setPendingFilters(filters);
    setShowFilterModal(true);
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <HeaderComponent
        headerTitle="Employee List"
        onBackPress={()=> navigate.goBack()}
        headerStyle={{ backgroundColor: "#a970ff" }}
        icon1Name="filter"
        icon1OnPress={openFilterModal}
        filterCount={appliedFilterCount}
      />
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Employees..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        </View>

         {/* Employee List */}
      {filteredEmployees.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <MaterialIcons name="people-outline" size={80} color="#d1d5db" />
          </View>
          <Text style={styles.emptyStateTitle}>No Employees Found</Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchQuery || selectedGrade || selectedDepartment
              ? "Try adjusting your search or filters"
              : "No employees are available at the moment"
            }
          </Text>
          {(searchQuery || selectedGrade || selectedDepartment) && (
            <TouchableOpacity style={styles.clearFiltersButtonEmpty} onPress={clearFilters}>
              <MaterialIcons name="refresh" size={20} color="#a970ff" />
              <Text style={styles.clearFiltersEmptyText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployeeCard}
          keyExtractor={(item) => item.id.toString()}
          style={styles.employeeList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
      </SafeAreaView>

      <FilterModal visible={showFilterModal} onClose={() => setShowFilterModal(false)}
        onClearFilters={() => {
          setPendingFilters({
            departments: "",
            grades: "",
          });
          setFilters({
            departments: "",
            grades: "",
          });
        }}
        filterConfigs={filterConfigs}
        modalTitle="Employee Grade and department"
        onApplyFilters={() => {
          setFilters(pendingFilters);
          setShowFilterModal(false);
        }}
      />

      <Loader visible={loading} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    // backgroundColor: '#a970ff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    // color: 'rgba(255, 255, 255, 0.8)',
    color: '#a970ff',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#a970ff',
  },
  filterButtonActive: {
    backgroundColor: '#a970ff',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filtersScroll: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
    alignSelf: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#a970ff',
    borderColor: '#a970ff',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  clearFiltersButton: {
     backgroundColor: 'rgba(169, 112, 255, 0.1)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#a970ff',
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  clearFiltersText: {
    color: '#a970ff',
    fontSize: 14,
    fontWeight: '600',
  },
  employeeList: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  employeeInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#a970ff',
  },
  managerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#a970ff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  gradeBadge: {
    backgroundColor: 'rgba(169, 112, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a970ff',
  },
  badgeText: {
    fontSize: 12,
    color: '#a970ff',
    fontWeight: '600',
  },
  timesheetButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: '#a970ff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  timesheetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cardBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
   emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateIcon: {
    backgroundColor: '#f8f9fa',
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#a970ff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  clearFiltersButtonEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(169, 112, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#a970ff',
    gap: 8,
  },
  clearFiltersEmptyText: {
    color: '#a970ff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmployeeListScreen;