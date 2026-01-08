import React, { useState } from 'react';
import { Platform, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import styled from 'styled-components/native';
import { colors } from '../Styles/appStyle';
import { Ionicons } from '@expo/vector-icons';

const DatePickerButton = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-width: 1px;
  border-color: ${({ disabled }) => (disabled ? '#ddd' : '#ccc')};
  padding: 10px;
  border-radius: 5px;
    background-color: ${({ disabled }) => (disabled ? '#f2f2f2' : '#fff')};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;

const FieldContainer = styled.View`
  /* margin-bottom: 20px; */
  margin-top: 5px;
`;


const DateText = styled.Text`
  font-size: 16px;
`;
const Label = styled.Text`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
  color: ${({ disabled }) => (disabled ? '#999' : '#000')};
`;

const Icon = styled.Image`
  width: 24px;
  height: 24px;
`;

const TimePicker = ({ error, label, cDate, setCDate, disable=false }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isValidDate = cDate instanceof Date && !isNaN(cDate);

  // Format time as HH:MM AM/PM or '--:--' if invalid
  const formatTime = (date) => {
    if (!isValidDate) return '--:--';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <FieldContainer>
      <Label disabled={disable}>{label}</Label>
      <DatePickerButton disabled={disable} onPress={() => !disable && setShowDatePicker(true)}>
        <DateText>{isValidDate ? formatTime(cDate) : '--:--'}</DateText>
        <Ionicons name="time-outline" size={22} color="black" />
      </DatePickerButton>

      {showDatePicker && !disable && (
        <DateTimePicker
          value={isValidDate ? cDate : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              if (event.type === 'set' && selectedDate) {
                setCDate(selectedDate);
              }
              setShowDatePicker(false);
            } else {
              // iOS: selectedDate is undefined if cancelled
              if (typeof event === 'object' && event.type === 'dismissed') {
                // do nothing
              } else if (selectedDate) {
                setCDate(selectedDate);
              }
            }
          }}
        />
      )}

      {error && (
        <Text style={{ marginTop: 7, color: colors.red, fontSize: 12 }}>
          {error}
        </Text>
      )}
    </FieldContainer>
  );
};


export default TimePicker;
